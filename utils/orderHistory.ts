import { PublicKey, Keypair, Connection, TransactionResponse } from "@solana/web3.js";
import Context from "../types/context";
import { Market, decodeInstruction } from "@project-serum/serum";
import { SERUM_DEX_PROGRAM_ID, SOL_DECIMALS, USDC_DECIMALS } from "../constants";
import bs58 from "bs58";
import { BN } from "@project-serum/anchor";
import { findOptifiInstruments ,findOptifiMarketsWithFullData} from "./market";
import { numberAssetToDecimal } from "./generic";
import Decimal from "decimal.js";
import { OptifiMarket } from "../types/optifi-exchange-types";
import { getSerumMarket } from "../utils/serum";
import { market } from "../scripts/constants";
import { BTC_DECIMALS,ETH_DECIMALS, getIOCSizeForAsk, getIOCSide, getClientId, getIOCFillAmt ,checkPostOnlyFail} from "./tradeHistory";
import base58, { decode } from "bs58";
import { Order } from "../utils/orders";

const inxNames = ["placeOrder", "cancelOrderByClientOrderId"];

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

async function getFilledData(context: Context, account: PublicKey,orderHistorys:OrderInstruction[]): Promise<number[]> {
  return new Promise(async (resolve, reject) => {
    let res: number[] = [];
    let txs = await retrievRecentTxs(context, account)
    for (let tx of txs) {//number of transactions people send
      for (let inx of tx.transaction.message.instructions) {
        let programId = tx.transaction.message.accountKeys[inx.programIdIndex];
        if (programId.toString() == context.program.programId.toString()) {
          let decoded = context.program.coder.instruction.decode(base58.decode(inx.data))
          if (decoded) {
            if (decoded.name == "placeOrder") {

              //@ts-ignore
              let types = await getIOCSide(tx.meta?.logMessages)
              //@ts-ignore
              let clientId = await getClientId(tx.meta?.logMessages)
              //@ts-ignore
              let fillAmt = await getIOCFillAmt(tx.meta?.logMessages)

              //get decimals
              // let optifiMarkets = await findOptifiMarketsWithFullData(context)
              // let trade = orderHistorys.find(e => e.clientId == clientId)
              // let optifiMarket = optifiMarkets.find(e => e.marketAddress.toString() == trade?.marketAddress)
              // //@ts-ignore
              // let decimal = (optifiMarket.asset == "BTC") ? BTC_DECIMALS : ETH_DECIMALS;
              let decimal = 2;

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
    resolve(res);
  })
}

const parseOrderTxs = async (context: Context, txs: TransactionResponse[], serumId: PublicKey, instruments: any): Promise<OrderInstruction[]> => {
  let orderTxs: OrderInstruction[] = [];

  for (let tx of txs) {
    let inxs = tx.transaction.message.instructions;
    for (let inx of inxs) {
      // console.log("inx.data: ", inx.data)
      // console.log("txid: ", tx.transaction.signatures[0]);
      let decodedInx = context.program.coder.instruction.decode(inx.data, "base58")
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

                  // convert the base amount to ui amount
                  let marketAddress = tx.transaction.message.accountKeys[inx.accounts[7]].toString() // market address index is 7 in the place order inx
                  let instrument = instruments.find((instrument: any) => {
                    return marketAddress === instrument.marketAddress.toString();
                  });
                  let baseTokenDecimal = numberAssetToDecimal(instrument.asset)!
                  record.maxBaseQuantity = record.maxBaseQuantity / 10 ** baseTokenDecimal

                  // let newOrderJSON = JSON.stringify(decData);
                  // console.log("newOrderJSON: ", newOrderJSON);
                  record.timestamp = new Date(tx.blockTime! * 1000);
                  record.txid = tx.transaction.signatures[0]
                  record.gasFee = tx.meta?.fee! / Math.pow(10, SOL_DECIMALS); // SOL has 9 decimals
                  record.marketAddress = marketAddress
                  record.txType = "place order"
                  orderTxs.push(Object.assign({}, record));
                } else if (decData.hasOwnProperty("cancelOrderByClientIdV2")) {

                  // get the orginal order details
                  let orginalOrder = orderTxs.find(e => e.clientId.toString() == decData.cancelOrderByClientIdV2.clientId.toString())!

                  // console.log("orginalOrder: ", orginalOrder, decData.cancelOrderByClientIdV2.clientId.toNumber())
                  if (orginalOrder) {
                    let record = JSON.parse(JSON.stringify(orginalOrder));
                    let marketAddress = tx.transaction.message.accountKeys[inx.accounts[6]].toString() // market address index is 6 in the cancel order inx
                    // console.log("tx.meta?.preTokenBalances: ", tx.meta?.preTokenBalances)
                    // console.log("tx.meta?.postTokenBalances: ", tx.meta?.postTokenBalances)
                    // console.log("inx.accounts: ", inx.accounts)
                    //  tx.transaction.message.accountKeys[inx.accounts[6]].toString()
                    let userMarginAccountIndex = inx.accounts[3]
                    let longTokenVaultIndex = inx.accounts[5]
                    // console.log("long vault: ",longTokenVaultIndex,  tx.transaction.message.accountKeys[longTokenVaultIndex].toString())
                    let cancelledQuantity: number = 0
                    if (record.side == "buy") {
                      let preTokenAccount = tx.meta?.preTokenBalances?.find(e => e.accountIndex == userMarginAccountIndex)!
                      let postTokenAccount = tx.meta?.postTokenBalances?.find(e => e.accountIndex == userMarginAccountIndex)!
                      cancelledQuantity = (new Decimal(postTokenAccount.uiTokenAmount.uiAmountString!).minus(new Decimal(preTokenAccount.uiTokenAmount.uiAmountString!))).toNumber()
                    } else {
                      let preTokenAccount = tx.meta?.preTokenBalances?.find(e => e.accountIndex == longTokenVaultIndex)!
                      let postTokenAccount = tx.meta?.postTokenBalances?.find(e => e.accountIndex == longTokenVaultIndex)!
                      // console.log("preTokenAccount: ", preTokenAccount, "postTokenAccount: " , postTokenAccount)
                      // console.log("tx.meta?.preTokenBalances? ", tx.meta?.preTokenBalances)
                      // console.log("tx.meta?.postTokenBalances? ", tx.meta?.postTokenBalances)
                      cancelledQuantity = (new Decimal(preTokenAccount.uiTokenAmount.uiAmountString!).minus(new Decimal(postTokenAccount.uiTokenAmount.uiAmountString!))).toNumber()
                    }

                    // console.log("cancelledAmount: ", cancelledAmount)
                    record.cancelledQuantity = cancelledQuantity
                    record.timestamp = new Date(tx.blockTime! * 1000);
                    record.txid = tx.transaction.signatures[0]
                    record.gasFee = tx.meta?.fee! / Math.pow(10, SOL_DECIMALS); // SOL has 9 decimals
                    record.marketAddress = marketAddress
                    record.txType = "cancel order"
                    orderTxs.push(record);
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

      // parse order txs, inlcuding place order, cancel order
      let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint]);
      let orderTxs = await parseOrderTxs(context, allTxs, serumId, instruments)
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
    status
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
      let originalSize: number[] = [];
      let currentSize: number[] = [];
      let clientIdIOC: number[] = await getFilledData(context, userAccount,orderHistorys)

      for (let i = 0; i < orders.length; i++) {
        //@ts-ignore
        originalSize[orders[i].clientId.toNumber()] = new Decimal(orders[i].originalSize).toNumber();
        currentSize[orders[i].clientId.toNumber()] = new Decimal(orders[i].size).toNumber();
      }

      for (let orderHistory of orderHistorys) {

        if (orderHistory.txType == "cancel order") {
          orderHistory.status = "Canceled";
          continue;
        }

        let clientId = orderHistory.clientId;

        if (orderHistory.orderType == "limit") {

          //there is currentSize,means it still on open order, 
          //and there isn't filled any, so originalSize and currentSize are same

          //@ts-ignore
          let thisClientidcancelOrderHistory: OrderInstruction = orderHistorys.find(e => ((e.clientId == orderHistory.clientId) && (e.txType == "cancel order")))
          if (((currentSize[clientId] == originalSize[clientId]) && (currentSize[clientId])) || //situation 1:normal place order
            (thisClientidcancelOrderHistory)) {//situation 2:place order , but be canceled, so can't find currentSize
            orderHistory.status = "Open";
            continue;
          }

          if (originalSize[clientId] > currentSize[clientId]) {
            let filledSize = new Decimal(originalSize[clientId]).minus(currentSize[clientId]);
            let res = Math.floor(filledSize.mul(100).div(originalSize[clientId]).toNumber()).toString();
            orderHistory.status = "Filled " + res + "%";
            continue;
          }

          if (!(currentSize[clientId])) {//not in open order, and it also not cancel order
            orderHistory.status = "Filled 100%";// when totally filled, it doesn't show on orders
            continue;
          }

          orderHistory.status = "Wrong status! please check"

        } else if (orderHistory.orderType == "ioc") {
          if (clientIdIOC[clientId]) orderHistory.status = "Filled"
          else orderHistory.status = "Failed"
        } else {
          // console.log(currentSize[clientId])
          // console.log(originalSize[clientId])
          //if post only success ,there are currentSize and originalSize

          //@ts-ignore
          let thisClientidcancelOrderHistory: OrderInstruction = orderHistorys.find(e => ((e.clientId == orderHistory.clientId) && (e.txType == "cancel order")))
          if (((currentSize[clientId] == originalSize[clientId]) && (currentSize[clientId])) || //situation 1:normal place order
            (thisClientidcancelOrderHistory)) {//situation 2:place order , but be canceled, so can't find currentSize
            orderHistory.status = "Open";
            continue;
          }

          if (originalSize[clientId] > currentSize[clientId]) {
            let filledSize = new Decimal(originalSize[clientId]).minus(currentSize[clientId]);
            let res = Math.floor(filledSize.mul(100).div(originalSize[clientId]).toNumber()).toString();
            orderHistory.status = "Filled " + res + "%";
            continue;
          }

          let postOnlyFail = await checkPostOnlyFail(context, userAccount, clientId);//wait for a long time...should be optimized
          if (postOnlyFail) {
            orderHistory.status = "Failed";
            continue;
          }

          orderHistory.status = "Filled 100%";

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