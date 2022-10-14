import { PublicKey, Keypair, Connection, TransactionResponse } from "@solana/web3.js";
import Context from "../types/context";
import { Market, decodeInstruction } from "@project-serum/serum";
import { SERUM_DEX_PROGRAM_ID, SOL_DECIMALS, USDC_DECIMALS } from "../constants";
import bs58 from "bs58";
import { BN, BorshCoder } from "@project-serum/anchor";
import { findOptifiInstruments, findOptifiMarketsWithFullData } from "./market";
import { numberAssetToDecimal } from "./generic";
import Decimal from "decimal.js";
import { OptifiMarket } from "../types/optifi-exchange-types";
import { getSerumMarket } from "../utils/serum";
import { market } from "../scripts/constants";
import { BTC_DECIMALS, ETH_DECIMALS, getIOCSizeForAsk, getIOCSide, getClientId, getIOCFillAmt } from "./tradeHistory";
import base58, { decode } from "bs58";
import { Order } from "../utils/orders";
import { populateInxAccountKeys } from "./transactions"
import { convertSolanaCulsterToCluster } from "./pyth";
import { OptifiMarketFullData } from "./market";
import fetch from 'cross-fetch';
const inxNames = ["placeOrder", "cancelOrderByClientOrderId", "liquidationRegister", "liquidationPlaceOrder", "userMarginCalculate"];

// get recent tx  - 1000 tx by default
export const retrievRecentTxs = async (context: Context,
  account: PublicKey): Promise<TransactionResponse[]> => {
  let result: TransactionResponse[] = []
  let signatures = await context.connection.getSignaturesForAddress(
    account
  );
  for (let signature of signatures) {
    let txid = signature.signature;
    let res = await context.connection.getTransaction(txid);
    let tx = res!;
    result.push(tx)
  }
  return result
}


// concurrently get recent txs - 1000 tx by default
export const retrievRecentTxsV2 = async (context: Context,
  account: PublicKey): Promise<TransactionResponse[]> => {
  return new Promise(async (resolve, reject) => {
    let result: TransactionResponse[] = []
    let signatures = await context.connection.getSignaturesForAddress(
      account
    );
    Promise.all(
      signatures.map((signature) =>
        context.connection.getTransaction(signature.signature).then((res) => {
          result.push(res!)
        }))
    ).then(() => resolve(result))
      .catch((err) => reject(err))
  })
}

export async function getFilledData(context: Context, account: PublicKey, orderHistorys: OrderInstruction[]): Promise<number[]> {
  return new Promise(async (resolve, reject) => {
    let res: number[] = [];
    let txs = await retrievRecentTxs(context, account)
    for (let tx of txs) {//number of transactions people send
      for (let inx of tx.transaction.message.instructions) {
        let programId = tx.transaction.message.accountKeys[inx.programIdIndex];
        if (programId.toString() == context.program.programId.toString()) {
          let coder = context.program.coder as BorshCoder;
          let decoded = coder.instruction.decode(base58.decode(inx.data))
          if (decoded) {
            if (decoded.name == "placeOrder") {

              //@ts-ignore
              let types = await getIOCSide(tx.meta?.logMessages)
              //@ts-ignore
              let clientId = await getClientId(tx.meta?.logMessages)
              //@ts-ignore
              let fillAmt = await getIOCFillAmt(tx.meta?.logMessages)

              //get decimals
              let optifiMarkets = await findOptifiMarketsWithFullData(context)
              let trade = orderHistorys.find(e => e.clientId == clientId)
              let optifiMarket = optifiMarkets.find(e => e.marketAddress.toString() == trade?.marketAddress)
              if (optifiMarket) {//can find optifiMarket(not cancel order)
                let decimal = (optifiMarket.asset == "BTC") ? BTC_DECIMALS : ETH_DECIMALS;

                if (types == "Ask") {
                  //user place Ask: market_open_orders.native_coin_total will be the amt after fill
                  //(ex: open order bid 2, user ask 3,  market_open_orders.native_coin_total will be 1;
                  //user ask 1 ,market_open_orders.native_coin_total will be 0
                  //->ask amt - market_open_orders.native_coin_total = fillAmt 

                  //@ts-ignore
                  let askAmt = await getIOCSizeForAsk(tx.meta?.logMessages)
                  if (clientId)
                    res[clientId] = (askAmt - fillAmt) / (10 ** decimal)
                } else {
                  if (clientId && fillAmt)
                    res[clientId] = fillAmt / (10 ** decimal)
                }
              }
            }
          }
        }
      }
    }
    resolve(res);
  })
}

async function getCancelledQuantity(logs: string[]): Promise<string> {
  return new Promise(async (resolve, reject) => {
    let stringRes: string;
    let stringLen = 26
    for (let i = 0; i < logs.length; i++) {
      if (logs[i].search("order's remaining amount:") != -1) {
        stringRes = logs[i].substring(logs[i].search("order's remaining amount:") + stringLen)
        resolve(stringRes)
      }
    }
    resolve("unknown")
  })
}

async function getLiquidateAmount(logs: string[]): Promise<number> {
  return new Promise(async (resolve, reject) => {
    let stringRes: string;
    let stringLen = 16
    for (let i = 0; i < logs.length; i++) {
      if (logs[i].search("remaining_size:") != -1) {
        stringRes = logs[i].substring(logs[i].search("remaining_size:") + stringLen, logs[i].search("price") - 2)
        resolve(Number(stringRes))
      }
    }
    resolve(0)
  })
}

async function getMarketExpireDate(context: Context, logs: string[], marketsWithFullDatas: OptifiMarketFullData[]): Promise<Date> {
  return new Promise(async (resolve, reject) => {
    let stringRes: string;
    let stringLen = 12
    for (let i = 0; i < logs.length; i++) {
      if (logs[i].search("instrument:") != -1) {
        stringRes = logs[i].substring(logs[i].search("instrument:") + stringLen)

        await context.program.account.chain.fetch(stringRes).then((chainRes) => {
          // @ts-ignore
          let chain = chainRes as Chain;
          resolve(new Date(chain.expiryDate.toNumber() * 1000))

        })
      }
    }

    //liquidation place order log
    stringLen = 15
    for (let i = 0; i < logs.length; i++) {
      if (logs[i].search("market_address") != -1) {
        stringRes = logs[i].substring(logs[i].search("market_address") + stringLen, logs[i].search("ctx.accounts.optifi_market.key()") - 1)

        let market = marketsWithFullDatas.find(e => e.marketAddress.toString() == stringRes)
        resolve(market?.expiryDate!)
      }
    }
    reject("can't find instrument in getMarketExpireDate");
  })
}

async function isLiquidatedOrCancelOrdersDuringFundSettlementTx(logs: string[]): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    for (let i = 0; i < logs.length; i++) {
      if (logs[i].search("found order to prune") != -1) {
        resolve(true)
      }
    }
    resolve(false)
  })
}

async function getTxClientId(logs: string[]) {
  let stringLen = 16
  let stringRes: string;
  for (let log of logs) {
    if (log.search("client_order_id") != -1) {
      stringRes = log.substring(log.search("client_order_id") + stringLen, log.search("remaining_size") - 2)
    }
  }
  //@ts-ignore
  return Number(stringRes)
}

async function getInstrument(logs: string[]) {
  let stringLen = 12
  let stringRes: string;
  for (let log of logs) {
    if (log.search("instrument:") != -1) {
      stringRes = log.substring(log.search("instrument:") + stringLen)
    }
  }
  //@ts-ignore
  return stringRes
}

async function placedLiquidateOrder(clientId: number, orderTxs: OrderInstruction[]) {
  for (let e of orderTxs) {
    if (e.clientId == clientId && e.orderType == "Liquidation") return true
  }
  return false
}

async function isLiquidationPlaceOrder(logs: string[]): Promise<Boolean> {
  return new Promise(async (resolve, reject) => {
    for (let i = 0; i < logs.length; i++) {
      if (logs[i].search("total_net_option_premiun") != -1) {
        for (let i = 0; i < logs.length; i++) {
          if (logs[i].search("Created new order instruction") != -1) {
            resolve(true)
          }
        }
      }
    }
    resolve(false)
  })
}

async function getStrikeFromInstrumentAddr(programId: string, addr: string) {
  try {
    let url = "https://lambda.optifi.app/get_instrument_strike?optifi_program_id=" + programId +
      "&instrument_addr=" + addr
    const response = await fetch(url, {
      method: "GET",
    });
    let res = await response.json()
    if (!response.ok) {
      console.log("err in getStrikeFromInstrumentAddr");
    }
    return res;
  } catch (error) { console.log(error) }
}

const parseOrderTxs = async (context: Context, txs: TransactionResponse[], serumId: PublicKey, instruments: any, optifiMarkets: OptifiMarketFullData[]): Promise<OrderInstruction[]> => {
  let orderTxs: OrderInstruction[] = [];
  for (let tx of txs) {
    let inxs = tx.transaction.message.instructions;
    for (let inx of inxs) {
      // console.log("inx.data: ", inx.data)
      // console.log("txid: ", tx.transaction.signatures[0]);
      let coder = context.program.coder as BorshCoder;
      let decodedInx = coder.instruction.decode(bs58.decode(inx.data))
      let programAccounts = populateInxAccountKeys(context, tx.transaction.message.accountKeys, inx)
      // console.log(decodedInx)
      // if (inx.data.includes(placeOrderSignature) || inx.data.includes(cancelOrderByClientOrderIdSignature)) {
      if (decodedInx && inxNames.includes(decodedInx.name)) {
        let innerInxs = tx.meta?.innerInstructions!;
        for (let innerInx of innerInxs) {
          for (let inx2 of innerInx.instructions) {
            let programId =
              tx.transaction.message.accountKeys[inx2.programIdIndex];
            // console.log("programId:", programId.toString());
            if (programId.toString() == serumId.toString()) {
              let dataBytes = bs58.decode(inx2.data);
              // console.log("dataBytes: ", dataBytes)
              // console.log(`serum instruction for ${txid}`, innerInx);
              try {
                let decData = decodeInstruction(dataBytes);
                // console.log("decData: ", decData)
                if (decData.hasOwnProperty("newOrderV3")) {
                  let record = new OrderInstruction(
                    decData.newOrderV3
                  );

                  if (await isLiquidationPlaceOrder(tx.meta?.logMessages!)) {// place order when be liquidated
                    record.orderType = "Liquidation"
                  }
                  // convert the base amount to ui amount
                  // let marketAddress = tx.transaction.message.accountKeys[inx.accounts[7]].toString() // market address index is 7 in the place order inx
                  if (programAccounts)
                    if (programAccounts.hasOwnProperty("optifiMarket")) {
                      //@ts-ignore
                      let marketAddress = programAccounts.optifiMarket.pubkey.toString();
                      let instrumentAddr = await getInstrument(tx.meta?.logMessages!)
                      let strike = await getStrikeFromInstrumentAddr(context.program.programId.toString(), instrumentAddr)
                      strike = (strike.result) ? strike.result[0] : null;
                      let instrument = instruments.find((instrument: any) => {
                        return marketAddress === instrument.marketAddress.toString();
                      });
                      let baseTokenDecimal = numberAssetToDecimal(instrument.asset)!
                      record.maxBaseQuantity = record.maxBaseQuantity / 10 ** baseTokenDecimal//original size

                      //getFilledData
                      //@ts-ignore
                      let types = await getIOCSide(tx.meta?.logMessages)
                      //@ts-ignore
                      let clientId = record.clientId
                      //@ts-ignore
                      let fillAmt = await getIOCFillAmt(tx.meta?.logMessages)
                      let optifiMarket = optifiMarkets.find(e => e.marketAddress.toString() == marketAddress)
                      if (optifiMarket) {//can find optifiMarket(not cancel order)
                        let decimal = (optifiMarket.asset == "BTC") ? BTC_DECIMALS : ETH_DECIMALS;
                        if (types == "Ask") {
                          //user place Ask: market_open_orders.native_coin_total will be the amt after fill
                          //(ex: open order bid 2, user ask 3,  market_open_orders.native_coin_total will be 1;
                          //user ask 1 ,market_open_orders.native_coin_total will be 0
                          //->ask amt - market_open_orders.native_coin_total = fillAmt 

                          //@ts-ignore
                          let askAmt = await getIOCSizeForAsk(tx.meta?.logMessages)
                          if (clientId)
                            record.filledData = (askAmt - fillAmt) / (10 ** decimal)
                        } else {
                          if (clientId && fillAmt)
                            record.filledData = fillAmt / (10 ** decimal)
                        }
                      }

                      //checkPostOnlyFail
                      record.checkPostOnlyFail = false;
                      let logs = tx.meta?.logMessages
                      //@ts-ignore
                      for (let log of logs) {
                        if (log.search("Order is failed...") != -1) {
                          record.checkPostOnlyFail = true;
                        }
                      }
                      let marketExpireDate = await getMarketExpireDate(context, logs!, optifiMarkets);

                      // let newOrderJSON = JSON.stringify(decData);
                      // console.log("newOrderJSON: ", newOrderJSON);
                      record.timestamp = new Date(tx.blockTime! * 1000);
                      record.txid = tx.transaction.signatures[0]
                      record.gasFee = tx.meta?.fee! / Math.pow(10, SOL_DECIMALS); // SOL has 9 decimals
                      record.marketAddress = marketAddress
                      record.txType = "place order"
                      record.decimal = baseTokenDecimal
                      record.start = instrument.start
                      record.marketExpireDate = marketExpireDate
                      record.instrumentAddr = instrumentAddr
                      record.strike = strike
                      orderTxs.push(Object.assign({}, record));
                    }
                } else if (decData.hasOwnProperty("cancelOrderByClientIdV2")) {
                  // get the orginal order details
                  let orginalOrder = orderTxs.find(e => e.clientId.toString() == decData.cancelOrderByClientIdV2.clientId.toString())!

                  // console.log("orginalOrder: ", orginalOrder, decData.cancelOrderByClientIdV2.clientId.toNumber())
                  if (orginalOrder) {
                    let record = JSON.parse(JSON.stringify(orginalOrder));
                    if (programAccounts) {
                      if (programAccounts.hasOwnProperty("serumMarket")) {
                        //@ts-ignore
                        let marketAddress = programAccounts.serumMarket.pubkey.toString();

                        // console.log("cancelledAmount: ", cancelledAmount)
                        record.cancelledQuantity = await getCancelledQuantity(tx.meta?.logMessages!);//cancelledQuantity
                        record.timestamp = new Date(tx.blockTime! * 1000);
                        record.txid = tx.transaction.signatures[0]
                        record.gasFee = tx.meta?.fee! / Math.pow(10, SOL_DECIMALS); // SOL has 9 decimals
                        record.marketAddress = marketAddress
                        record.txType = "cancel order"
                        orderTxs.push(record);
                      }
                    }
                  }
                }
                //since cancel order by Liquidate and fund settlement tx logs are same, so now we can't separate it  
                else if (await isLiquidatedOrCancelOrdersDuringFundSettlementTx(tx.meta?.logMessages!) && decData.hasOwnProperty("settleFunds")) {
                  if (decodedInx.name == "userMarginCalculate") { //fund settlement tx 
                    let clientId = await getTxClientId(tx.meta?.logMessages!)
                    let cancelOrdersDuringFundSettlementTx = orderTxs.find(e => e.clientId === clientId)
                    let record: any = [];
                    record = (cancelOrdersDuringFundSettlementTx) ? JSON.parse(JSON.stringify(cancelOrdersDuringFundSettlementTx)) : null;
                    if (record) {
                      record.orderType = "ioc"
                      record.txType = "cancel order"
                      record.timestamp = new Date(tx.blockTime! * 1000);
                      orderTxs.push(record)
                    }
                  }
                  else if (decodedInx.name == "liquidationRegister") {//liquidate tx
                    let clientId = await getTxClientId(tx.meta?.logMessages!)
                    let liquidateTx = orderTxs.find(e => e.clientId === clientId)
                    let record: any = [];
                    record = JSON.parse(JSON.stringify(liquidateTx));
                    if (record && (! await placedLiquidateOrder(clientId, orderTxs))) {//sometime there are mul same tx. Avoid place duplicate orders
                      record.orderType = "Liquidation"
                      record.txType = "cancel order"
                      record.timestamp = new Date(tx.blockTime! * 1000);
                      record.liquidateAmount = await getLiquidateAmount(tx.meta?.logMessages!);
                      orderTxs.push(record)
                    }
                  }
                }

              } catch (e) {
                console.log(e);
              }
            }
          }
        }
      }
    }
    // }
  };
  return orderTxs
}

export function getAllOrdersForAccount(
  context: Context,
  account: PublicKey,
  optifiMarkets: OptifiMarketFullData[],
  instrumentsWithOptifiMarketAddress?: any,
): Promise<OrderInstruction[]> {
  return new Promise(async (resolve, reject) => {
    try {
      // get all recent txs
      let allTxs = await retrievRecentTxsV2(context, account)
      // sort them in ascending time order for btter parsing process
      allTxs.sort(function (a, b) {
        // Compare the 2 dates
        if (a.slot < b.slot) return -1;
        if (a.slot > b.slot) return 1;
        return 0;
      });

      let instruments
      if (instrumentsWithOptifiMarketAddress) {
        instruments = instrumentsWithOptifiMarketAddress
      } else {
        let optifiInstruments = await findOptifiInstruments(context)
        instruments = optifiInstruments.map(e => {
          // @ts-ignore
          e[0].marketAddress = e[2]
          return e[0]
        })
      }

      // parse order txs, inlcuding place order, cancel order
      let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.cluster]);
      let orderTxs = await parseOrderTxs(context, allTxs, serumId, instruments, optifiMarkets)
      // sort them back to descending time order
      orderTxs.sort(function (a, b) {
        // Compare the 2 dates
        if (a.timestamp < b.timestamp) return 1;
        if (a.timestamp > b.timestamp) return -1;
        return 0;
      });

      resolve(orderTxs)
    }
    catch (err) {
      console.error(err);
      reject(err)
    }
  });
}

//filter, use the frist instrument to get start and expiryDate
function filterByDate(instrument: any, allTxs: TransactionResponse[]) {
  let start = instrument.start.toNumber()
  let end = instrument.expiryDate.toNumber()
  let filterAllTxs = allTxs.filter(e => ((e.blockTime! < end) && (e.blockTime! > start)))
  return filterAllTxs
}

export function getFilterOrdersForAccount(
  context: Context,
  account: PublicKey,
  optifiMarkets: OptifiMarketFullData[],
  instrumentsWithOptifiMarketAddress?: any
): Promise<OrderInstruction[]> {
  return new Promise(async (resolve, reject) => {
    try {
      // get all recent txs
      let allTxs = await retrievRecentTxsV2(context, account)
      // sort them in ascending time order for btter parsing process
      allTxs.sort(function (a, b) {
        // Compare the 2 dates
        if (a.slot < b.slot) return -1;
        if (a.slot > b.slot) return 1;
        return 0;
      });

      let instruments
      if (instrumentsWithOptifiMarketAddress) {
        instruments = instrumentsWithOptifiMarketAddress
      } else {
        let optifiInstruments = await findOptifiInstruments(context)
        instruments = optifiInstruments.map(e => {
          // @ts-ignore
          e[0].marketAddress = e[2]
          return e[0]
        })
      }

      let filterAllTxs = filterByDate(instruments[0], allTxs)

      // parse order txs, inlcuding place order, cancel order
      let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.cluster]);
      let orderTxs = await parseOrderTxs(context, filterAllTxs, serumId, instruments, optifiMarkets)
      // sort them back to descending time order
      orderTxs.sort(function (a, b) {
        // Compare the 2 dates
        if (a.timestamp < b.timestamp) return 1;
        if (a.timestamp > b.timestamp) return -1;
        return 0;
      });

      resolve(orderTxs)
    }
    catch (err) {
      console.error(err);
      reject(err)
    }
  });
}
export class OrderInstruction {
  clientId: number; // BN {negative: 0, words: Array(3), length: 1, red: null}
  limit: number; // 65535
  limitPrice: number; // BN {negative: 0, words: Array(3), length: 1, red: null}
  maxBaseQuantity: number; // BN {negative: 0, words: Array(3), length: 1, red: null}
  maxQuoteQuantity: number; // BN {negative: 0, words: Array(3), length: 2, red: null}
  orderType: string; // "limit"
  selfTradeBehavior: string; // "decrementTake"
  side: string; // "buy" // TODO enum
  timestamp: Date
  txid: string
  gasFee: number
  marketAddress: string
  txType: "place order" | "cancel order"
  cancelledQuantity: number | undefined
  status: string
  decimal: number
  start: Date
  filledData: number
  checkPostOnlyFail: boolean
  marketExpireDate: Date
  liquidateAmount: number | undefined
  instrumentAddr: string
  strike: string

  constructor({
    clientId,
    limit,
    limitPrice,
    maxBaseQuantity,
    maxQuoteQuantity,
    orderType,
    selfTradeBehavior,
    side,
    timestamp,
    txid,
    gasFee,
    marketAddress,
    txType,
    cancelledQuantity,
    status,
    decimal,
    start,
    filledData,
    checkPostOnlyFail,
    marketExpireDate,
    liquidateAmount,
    instrumentAddr,
    strike
  }: {
    clientId: BN;
    limit: number;
    limitPrice: BN;
    maxBaseQuantity: BN;
    maxQuoteQuantity: BN;
    orderType: string;
    selfTradeBehavior: string;
    side: string;
    timestamp: Date;
    txid: string
    gasFee: number
    marketAddress: string
    txType: "place order" | "cancel order"
    cancelledQuantity: number | undefined
    status: string
    decimal: number
    start: Date
    filledData: number
    checkPostOnlyFail: boolean
    marketExpireDate: Date
    liquidateAmount: number | undefined
    instrumentAddr: string
    strike: string
  }) {
    this.clientId = clientId.toNumber();
    this.limit = limit;
    this.limitPrice = limitPrice.toNumber() / Math.pow(10, USDC_DECIMALS);
    this.maxBaseQuantity = maxBaseQuantity.toNumber();
    this.maxQuoteQuantity = maxQuoteQuantity.toNumber() / Math.pow(10, USDC_DECIMALS);
    this.orderType = orderType;
    this.selfTradeBehavior = selfTradeBehavior;
    this.side = side;
    this.timestamp = timestamp;
    this.txid = txid;
    this.gasFee = gasFee;
    this.marketAddress = marketAddress
    this.txType = txType
    this.cancelledQuantity = cancelledQuantity
    this.status = status
    this.decimal = decimal
    this.start = start
    this.filledData = filledData
    this.checkPostOnlyFail = checkPostOnlyFail
    this.marketExpireDate = marketExpireDate
    this.liquidateAmount = liquidateAmount
    this.instrumentAddr = instrumentAddr
    this.strike = strike
  }

  public get shortForm(): string {
    return `${this.side} ${this.limit} @ ${this.limitPrice}`;
  }
}

export function addStatusInOrderHistory(
  orders: Order[],//對於這個user 他在全部market 上面的open orders
  orderHistorys: OrderInstruction[],
  context: Context,
  userAccount: PublicKey
): Promise<OrderInstruction[]> {
  return new Promise(async (resolve, reject) => {

    try {
      // 用戶一開始下單的數量,不會被任何操作影響
      let originalSize: Decimal[] = [];
      //cancel order 時被cancel的數量
      let cancelSize: Decimal[] = [];
      //check this clientId is liquidated
      let isLiquidated: Decimal[] = [];

      //originalSize
      for (let orderHistory of orderHistorys) {
        originalSize[orderHistory.clientId] = new Decimal(orderHistory.maxBaseQuantity);
      }

      //cancelSize
      for (let orderHistory of orderHistorys) {
        if (orderHistory.cancelledQuantity) {
          cancelSize[orderHistory.clientId] = new Decimal(orderHistory.cancelledQuantity)
          // find decimal from place order history, since no assign decimal when generate cancel order history
          // let decimal = orderHistorys.find(e => e.clientId == orderHistory.clientId && e.decimal)?.decimal
          // if (decimal)
          //   cancelSize[orderHistory.clientId] = (cancelSize[orderHistory.clientId]).div(10 ** decimal)
        }
      }
      for (let orderHistory of orderHistorys) {
        if (!cancelSize[orderHistory.clientId])
          cancelSize[orderHistory.clientId] = new Decimal(0)
      }

      //is liquidated
      for (let orderHistory of orderHistorys) {
        isLiquidated[orderHistory.clientId] = new Decimal(0)
      }
      for (let orderHistory of orderHistorys) {
        if (orderHistory.orderType == "Liquidation") {
          if (orderHistory.liquidateAmount) {
            isLiquidated[orderHistory.clientId] = new Decimal(orderHistory.liquidateAmount)
            // find decimal from place order history, since no assign decimal when generate liquidate order history
            let decimal = orderHistorys.find(e => e.clientId == orderHistory.clientId && e.decimal)?.decimal
            if (decimal)
              isLiquidated[orderHistory.clientId] = (isLiquidated[orderHistory.clientId]).div(10 ** decimal)
          }
        }
      }

      for (let orderHistory of orderHistorys) {

        if (orderHistory.txType == "cancel order") {
          orderHistory.status = "Canceled";
          continue;
        }

        let clientId = orderHistory.clientId;

        if (orderHistory.orderType == "limit") {

          //the order history which is liquidated, but is place order, not the liquidated order 
          if (!isLiquidated[orderHistory.clientId].equals(new Decimal(0))) {
            if (originalSize[clientId].equals(isLiquidated[clientId])) {//在open的狀況下被liquidate
              console.log("liquidated open")
              orderHistory.status = "Open";
              continue;
            } else {
              let filledAmt = originalSize[clientId].minus(isLiquidated[clientId]);
              let res = Math.floor(filledAmt.mul(100).div(originalSize[clientId]).toNumber()).toString();
              orderHistory.status = "Filled " + res + "%";
              continue;
            }
          }

          if (cancelSize[clientId].equals(new Decimal(0))) {//最後沒被cancel
            let order = orders.find(e => e.clientId?.toNumber() == clientId)
            if (order) {//沒有被totally fill
              if (!order.fillPercentage) {//open
                console.log("no canceled open")
                orderHistory.status = "Open";
                continue;
              } else {
                let res = ((order.fillPercentage * 100).toFixed(2))?.toString();
                console.log("no canceled filled " + res + "%")
                orderHistory.status = "Filled " + res + "%";
                continue;
              }
            } else {//totally fill
              console.log("no canceled totally filled ")
              orderHistory.status = "Filled 100%";
            }
          } else {//最後被cancel 了
            if (originalSize[clientId].equals(cancelSize[clientId])) {//在open的狀況下被cancel
              console.log("canceled open")
              orderHistory.status = "Open";
              continue;
            } else {
              let filledAmt = originalSize[clientId].minus(cancelSize[clientId]);
              let res = Math.floor(filledAmt.mul(100).div(originalSize[clientId]).toNumber()).toString();
              orderHistory.status = "Filled " + res + "%";
              continue;
            }
          }

        } else if (orderHistory.orderType == "ioc") {
          if (orderHistory.filledData) {
            orderHistory.maxBaseQuantity = orderHistory.filledData
            orderHistory.status = "Filled"
          }
          else orderHistory.status = "Failed"
        } else if (orderHistory.orderType == "postOnly") {
          if (orderHistory.checkPostOnlyFail) {
            orderHistory.status = "Failed";
            continue;
          }

          //the order history which is liquidated, but is place order, not the liquidated order 
          if (!isLiquidated[orderHistory.clientId].equals(new Decimal(0))) {
            if (originalSize[clientId].equals(isLiquidated[clientId])) {//在open的狀況下被liquidate
              console.log("liquidated open")
              orderHistory.status = "Open";
              continue;
            } else {
              let filledAmt = originalSize[clientId].minus(isLiquidated[clientId]);
              let res = Math.floor(filledAmt.mul(100).div(originalSize[clientId]).toNumber()).toString();
              orderHistory.status = "Filled " + res + "%";
              continue;
            }
          }

          if (cancelSize[clientId].equals(new Decimal(0))) {//最後沒被cancel
            let order = orders.find(e => e.clientId?.toNumber() == clientId)
            if (order) {//沒有被totally fill
              if (!order.fillPercentage) {//open
                orderHistory.status = "Open";
                continue;
              } else {
                let res = ((order.fillPercentage * 100).toFixed(2))?.toString();
                orderHistory.status = "Filled " + res + "%";
                continue;
              }
            } else {//totally fill
              orderHistory.status = "Filled 100%";
            }
          } else {//最後被cancel 了
            if (originalSize[clientId].equals(cancelSize[clientId])) {//在open的狀況下被cancel
              orderHistory.status = "Open";
              continue;
            } else {
              let filledAmt = originalSize[clientId].minus(cancelSize[clientId]);
              let res = Math.floor(filledAmt.mul(100).div(originalSize[clientId]).toNumber()).toString();
              orderHistory.status = "Filled " + res + "%";
              continue;
            }
          }

        } else if (orderHistory.orderType == "Liquidation") {
          if (orderHistory.txType == "place order") {//place order when user is liquidated
            //the order history which is liquidated, but is place order, not the liquidated order 
            if (!isLiquidated[orderHistory.clientId].equals(new Decimal(0))) {
              if (originalSize[clientId].equals(isLiquidated[clientId])) {//在open的狀況下被liquidate
                console.log("liquidated open")
                orderHistory.status = "Open";
                continue;
              } else {
                let filledAmt = originalSize[clientId].minus(isLiquidated[clientId]);
                let res = Math.floor(filledAmt.mul(100).div(originalSize[clientId]).toNumber()).toString();
                orderHistory.status = "Filled " + res + "%";
                continue;
              }
            }

            if (cancelSize[clientId].equals(new Decimal(0))) {//最後沒被cancel
              let order = orders.find(e => e.clientId?.toNumber() == clientId)
              if (order) {//沒有被totally fill
                if (!order.fillPercentage) {//open
                  console.log("no canceled open")
                  orderHistory.status = "Open";
                  continue;
                } else {
                  let res = ((order.fillPercentage * 100).toFixed(2))?.toString();
                  console.log("no canceled filled " + res + "%")
                  orderHistory.status = "Filled " + res + "%";
                  continue;
                }
              } else {//totally fill
                console.log("no canceled totally filled ")
                orderHistory.status = "Filled 100%";
              }
            } else {//最後被cancel 了
              if (originalSize[clientId].equals(cancelSize[clientId])) {//在open的狀況下被cancel
                console.log("canceled open")
                orderHistory.status = "Open";
                continue;
              } else {
                let filledAmt = originalSize[clientId].minus(cancelSize[clientId]);
                let res = Math.floor(filledAmt.mul(100).div(originalSize[clientId]).toNumber()).toString();
                orderHistory.status = "Filled " + res + "%";
                continue;
              }
            }

          }
        }
      }
      resolve(orderHistorys);
    }
    catch (err) {
      console.error(err);
      reject(err)
    }
  });
}
