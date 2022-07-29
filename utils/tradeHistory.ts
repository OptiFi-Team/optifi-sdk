import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import Context from "../types/context";

import { findUserAccount } from "../utils/accounts";
import { loadOrdersAccountsForOwnerV2, loadOrdersForOwnerOnAllMarkets, Order } from "../utils/orders";
import { findOptifiMarketsWithFullData } from "../utils/market";
import { getAllOrdersForAccount, OrderInstruction, getFilledData } from "../utils/orderHistory";
import { retrievRecentTxs } from "./orderHistory";
import base58, { decode } from "bs58";
import Decimal from "decimal.js";
import { BorshCoder } from "@project-serum/anchor";

export const BTC_DECIMALS = 2;
export const ETH_DECIMALS = 1;

async function getOrders(context: Context): Promise<Order[]> {
  return new Promise(async (resolve, reject) => {
    let [userAccount,] = await findUserAccount(context)
    let optifiMarkets = await findOptifiMarketsWithFullData(context)
    let [userAccountAddress,] = await findUserAccount(context)

    let openOrdersAccount = await loadOrdersAccountsForOwnerV2(context, optifiMarkets, userAccountAddress)
    let orderHistory = await getAllOrdersForAccount(context, userAccount,)
    let orders = await loadOrdersForOwnerOnAllMarkets(optifiMarkets, openOrdersAccount.map(e => e.openOrdersAccount), orderHistory)
    resolve(orders)
  })
}

async function getFillAmt(context: Context, orderHistorys: OrderInstruction[], orders: Order[]): Promise<number[]> {
  return new Promise(async (resolve, reject) => {
    let res: number[] = [];

    for (let i = 0; i < orders.length; i++) {
      let clientId = orders[i].clientId;
      let orderHistory = orderHistorys.find(e => e.clientId == clientId?.toNumber())
      res[orders[i].clientId!.toNumber()] = (orderHistory) ? (new Decimal(orderHistory?.maxBaseQuantity!).minus(new Decimal(orders[i].size).toNumber())).toNumber() : 0;
    }
    resolve(res);
  })
}

//refer:logAMMAccounts
export async function getClientId(logs: string[]) {
  let stringLen = 20
  let stringRes: string;
  for (let log of logs) {
    if (log.search("get client_order_id") != -1) {
      stringRes = log.substring(log.search("get client_order_id") + stringLen, log.search("order_type"))
    }
  }
  //@ts-ignore
  return Number(stringRes)
}

//refer:logAMMAccounts
export async function getOrderType(logs: string[]) {
  let stringLen = 10
  let stringRes: string;
  for (let log of logs) {
    if (log.search("get client_order_id") != -1) {
      stringRes = log.substring(log.search("get order_type") + stringLen, log.search("native_coin_total"))
    }
  }
  //@ts-ignore
  return stringRes
}

//refer:logAMMAccounts
export async function getIOCFillAmt(logs: string[]) {
  let stringLen = 20
  let stringRes: string;
  for (let log of logs) {
    if (log.search("native_coin_total_2") != -1) {
      stringRes = log.substring(log.search("native_coin_total_2") + stringLen, log.search("native_pc_total"))
    }
  }
  //@ts-ignore
  return Number(stringRes)
}

//refer:logAMMAccounts
export async function getIOCSide(logs: string[]) {
  let stringLen = 6
  let stringRes: string;
  for (let log of logs) {
    if (log.search("Created new order instruction") != -1) {
      stringRes = log.substring(log.search("side") + stringLen, log.search("price") - 2)
    }
  }
  //@ts-ignore
  return stringRes
}

//refer:logAMMAccounts
export async function getIOCSizeForAsk(logs: string[]) {
  let stringLen = 6
  let stringRes: string;
  for (let log of logs) {
    if (log.search("Created new order instruction") != -1) {
      stringRes = log.substring(log.search("size") + stringLen, log.search("value") - 2)
    }
  }
  //@ts-ignore
  return Number(stringRes)
}

async function getIOCData(context: Context, account: PublicKey, trades: Trade[], clientId: number): Promise<number[]> {
  return new Promise(async (resolve, reject) => {
    let res: number[] = [];
    let txs = await retrievRecentTxs(context, account)
    for (let tx of txs) {//number of transactions people send
      //@ts-ignore
      let idFromProgramLog = await getClientId(tx.meta?.logMessages)
      if (idFromProgramLog != clientId) continue;
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
              // let optifiMarkets = await findOptifiMarketsWithFullData(context)
              // let trade = trades.find(e => e.clientId == clientId)
              // let optifiMarket = optifiMarkets.find(e => e.marketAddress.toString() == trade?.marketAddress)
              // //@ts-ignore
              // let decimal = (optifiMarket?.asset == "BTC") ? BTC_DECIMALS : ETH_DECIMALS;
              let decimal = 2;

              if (types == "Ask") {
                //user place Ask: market_open_orders.native_coin_total will be the amt after fill
                //(ex: open order bid 2, user ask 3,  market_open_orders.native_coin_total will be 1;
                //user ask 1 ,market_open_orders.native_coin_total will be 0
                //->ask amt - market_open_orders.native_coin_total = res

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

export async function checkPostOnlyFail(context: Context, account: PublicKey, clientId: number): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    let fail: boolean = false;

    let txs = await retrievRecentTxs(context, account)
    for (let tx of txs) {//number of transactions people send
      //@ts-ignore
      let idFromProgramLog = await getClientId(tx.meta?.logMessages)
      if (idFromProgramLog != clientId) continue;
      for (let inx of tx.transaction.message.instructions) {
        let programId = tx.transaction.message.accountKeys[inx.programIdIndex];
        if (programId.toString() == context.program.programId.toString()) {
          let coder = context.program.coder as BorshCoder;
          let decoded = coder.instruction.decode(base58.decode(inx.data))
          if (decoded) {
            if (decoded.name == "placeOrder") {
              let logs = tx.meta?.logMessages
              //@ts-ignore
              for (let log of logs) {
                if (log.search("Order is failed...") != -1) {
                  fail = true;
                  resolve(fail);
                }
              }
            }
          }
        }
      }
    }
    resolve(fail);
  })
}

async function pushInTrade(orderHistory: OrderInstruction, trades: Trade[]): Promise<Trade[]> {
  return new Promise(async (resolve, reject) => {
    trades.push(new Trade({
      clientId: orderHistory.clientId,
      limit: orderHistory.limit,
      limitPrice: orderHistory.limitPrice,
      maxBaseQuantity: orderHistory.maxBaseQuantity,
      maxQuoteQuantity: orderHistory.maxQuoteQuantity,
      orderType: orderHistory.orderType,
      // selfTradeBehavior,
      side: orderHistory.side,
      timestamp: orderHistory.timestamp,
      txid: orderHistory.txid,
      gasFee: orderHistory.gasFee,
      marketAddress: orderHistory.marketAddress
    }))
    resolve(trades)
  })
}

export function getAllTradesForAccount(
  context: Context,
  account: PublicKey
): Promise<Trade[]> {
  return new Promise(async (resolve, reject) => {
    getAllOrdersForAccount(context, account).then(async (res) => {
      // resolve(res)
      res.reverse()
      let trades: Trade[] = []
      let orders = await getOrders(context)
      // let clientIdFillAmt: number[] = await getFillAmt(context, res, orders);

      let originalSize: Decimal[] = [];
      //cancel order 時被cancel的數量
      let cancelSize: Decimal[] = [];

      //originalSize
      for (let orderHistory of res) {
        originalSize[orderHistory.clientId] = new Decimal(orderHistory.maxBaseQuantity);
      }

      //cancelSize
      for (let orderHistory of res) {
        if (orderHistory.cancelledQuantity) {
          cancelSize[orderHistory.clientId] = new Decimal(orderHistory.cancelledQuantity)
          // find decimal from place order history, since no assign decimal when generate cancel order history
          let decimal = res.find(e => e.clientId == orderHistory.clientId && e.decimal)?.decimal
          if (decimal)
            cancelSize[orderHistory.clientId] = (cancelSize[orderHistory.clientId]).div(10 ** decimal)
        }
      }
      for (let orderHistory of res) {
        if (!cancelSize[orderHistory.clientId])
          cancelSize[orderHistory.clientId] = new Decimal(0)
      }

      for (let orderHistory of res) {
        let clientId = orderHistory.clientId;

        // Limit on trade history:
        // 1. totally Filled
        // 2. Partial Filled 
        // 3. Partial Filled and be canceled 
        if (orderHistory.orderType == "limit") {
          if (cancelSize[clientId].equals(new Decimal(0))) {//最後沒被cancel
            let order = orders.find(e => e.clientId?.toNumber() == clientId)
            if (order) {//沒有被totally fill
              if (order.fillPercentage) {//2. Partial Filled 
                orderHistory.maxBaseQuantity = Number((orderHistory.maxBaseQuantity * order.fillPercentage!).toFixed(2))
                trades = await pushInTrade(orderHistory, trades)
                continue;
              }
            } else {//1. totally Filled
              trades = await pushInTrade(orderHistory, trades)
              continue;
            }
          } else {//最後被cancel 了
            if (!originalSize[clientId].equals(cancelSize[clientId]) && (orderHistory.txType != "cancel order")) {// 3. Partial Filled and be canceled 
              let filledAmt = originalSize[clientId].minus(cancelSize[clientId]);
              let res = (filledAmt.div(originalSize[clientId]));
              orderHistory.maxBaseQuantity = Number((new Decimal(orderHistory.maxBaseQuantity).mul(res)).toFixed(2))
              trades = await pushInTrade(orderHistory, trades)
              continue;
            }
          }
        }

        // IOC on trade history:
        // 1. totally Filled
        if (orderHistory.orderType == "ioc") {
          let clientIdIOC: number[] = await getFilledData(context, account, res)
          if (clientIdIOC[clientId]) {
            orderHistory.maxBaseQuantity = clientIdIOC[clientId]
            trades = await pushInTrade(orderHistory, trades)
            continue;
          }
        }

        // postOnly on trade history:
        // 1. totally Filled
        // 2. Partial Filled
        // 3. Partial Filled and be canceled 
        if (orderHistory.orderType == "postOnly") {
          let postOnlyFail = await checkPostOnlyFail(context, account, clientId);//wait for a long time...should be optimized
          if (postOnlyFail) {
            continue;
          }
          if (cancelSize[clientId].equals(new Decimal(0))) {//最後沒被cancel
            let order = orders.find(e => e.clientId?.toNumber() == clientId)
            if (order) {//沒有被totally fill
              if (order.fillPercentage) {// 2. Partial Filled 
                orderHistory.maxBaseQuantity = Number((orderHistory.maxBaseQuantity * order.fillPercentage!).toFixed(2))
                trades = await pushInTrade(orderHistory, trades)
                continue;
              }
            } else {// 1. totally Filled
              trades = await pushInTrade(orderHistory, trades)
              continue;
            }
          } else {//最後被cancel 了
            if (!originalSize[clientId].equals(cancelSize[clientId]) && (orderHistory.txType != "cancel order")) {//3. Partial Filled and be canceled 
              let filledAmt = originalSize[clientId].minus(cancelSize[clientId]);
              let res = (filledAmt.div(originalSize[clientId]));
              orderHistory.maxBaseQuantity = Number((new Decimal(orderHistory.maxBaseQuantity).mul(res)).toFixed(2))
              trades = await pushInTrade(orderHistory, trades)
              continue;
            }
          }
        }
      }

      trades.reverse()
      resolve(trades)
    }).catch(err => reject(err))

  })

}

export class Trade {
  clientId: number; // BN {negative: 0, words: Array(3), length: 1, red: null}
  limit: number; // 65535
  limitPrice: number; // BN {negative: 0, words: Array(3), length: 1, red: null}
  maxBaseQuantity: number; // BN {negative: 0, words: Array(3), length: 1, red: null}
  maxQuoteQuantity: number; // BN {negative: 0, words: Array(3), length: 2, red: null}
  orderType: string; // "limit"
  // selfTradeBehavior: string; // "decrementTake"
  side: string; // "buy" // TODO enum
  timestamp: Date
  txid: string
  gasFee: number
  marketAddress: string

  constructor({
    clientId,
    limit,
    limitPrice,
    maxBaseQuantity,
    maxQuoteQuantity,
    orderType,
    // selfTradeBehavior,
    side,
    timestamp,
    txid,
    gasFee,
    marketAddress
  }: {
    clientId: number;
    limit: number;
    limitPrice: number;
    maxBaseQuantity: number;
    maxQuoteQuantity: number;
    orderType: string;
    // selfTradeBehavior: string;
    side: string;
    timestamp: Date;
    txid: string
    gasFee: number
    marketAddress: string
  }) {
    this.clientId = clientId
    this.limit = limit;
    this.limitPrice = limitPrice
    this.maxBaseQuantity = maxBaseQuantity
    this.maxQuoteQuantity = maxQuoteQuantity
    this.orderType = orderType;
    // this.selfTradeBehavior = selfTradeBehavior;
    this.side = side;
    this.timestamp = timestamp;
    this.txid = txid;
    this.gasFee = gasFee;
    this.marketAddress = marketAddress
  }

  public get shortForm(): string {
    return `${this.side} ${this.limit} @ ${this.limitPrice}`;
  }
}
