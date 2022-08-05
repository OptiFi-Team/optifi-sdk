import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import Context from "../types/context";

import { findUserAccount } from "../utils/accounts";
import { loadOrdersAccountsForOwnerV2, loadOrdersForOwnerOnAllMarkets, Order ,getAllOpenOrdersForUser} from "../utils/orders";
import { findOptifiMarketsWithFullData } from "../utils/market";
import { getAllOrdersForAccount, OrderInstruction, getFilledData,getFilterOrdersForAccount } from "../utils/orderHistory";
import { retrievRecentTxs } from "./orderHistory";
import base58, { decode } from "bs58";
import Decimal from "decimal.js";
import { BorshCoder } from "@project-serum/anchor";

export const BTC_DECIMALS = 2;
export const ETH_DECIMALS = 1;

async function getOrders(context: Context): Promise<Order[]> {
  return new Promise(async (resolve, reject) => {
    // let [userAccount,] = await findUserAccount(context)
    let optifiMarkets = await findOptifiMarketsWithFullData(context)
    let orders = await getAllOpenOrdersForUser(context,optifiMarkets)
    // let [userAccountAddress,] = await findUserAccount(context)

    // let openOrdersAccount = await loadOrdersAccountsForOwnerV2(context, optifiMarkets, userAccountAddress)
    // let orderHistory = await getAllOrdersForAccount(context, userAccount,)
    // let orders = await loadOrdersForOwnerOnAllMarkets(optifiMarkets, openOrdersAccount.map(e => e.openOrdersAccount), orderHistory)
    resolve(orders)
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
      marketAddress: orderHistory.marketAddress,
      start: orderHistory.start
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
          if (orderHistory.filledData) {
            orderHistory.maxBaseQuantity = orderHistory.filledData
            trades = await pushInTrade(orderHistory, trades)
            continue;
          }
        }

        // postOnly on trade history:
        // 1. totally Filled
        // 2. Partial Filled
        // 3. Partial Filled and be canceled 
        if (orderHistory.orderType == "postOnly") {
          if (orderHistory.checkPostOnlyFail) {
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

export function getFilterTradesForAccount(
  context: Context,
  account: PublicKey
): Promise<Trade[]> {
  return new Promise(async (resolve, reject) => {
    getFilterOrdersForAccount(context, account).then(async (res) => {
      // resolve(res)
      res.reverse()
      let trades: Trade[] = []
      let orders = await getOrders(context)

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
          if (orderHistory.filledData) {
            orderHistory.maxBaseQuantity = orderHistory.filledData
            trades = await pushInTrade(orderHistory, trades)
            continue;
          }
        }

        // postOnly on trade history:
        // 1. totally Filled
        // 2. Partial Filled
        // 3. Partial Filled and be canceled 
        if (orderHistory.orderType == "postOnly") {
          if (orderHistory.checkPostOnlyFail) {
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
  start: Date

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
    marketAddress,
    start
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
    start: Date
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
    this.marketAddress = marketAddress;
    this.start = start
  }

  public get shortForm(): string {
    return `${this.side} ${this.limit} @ ${this.limitPrice}`;
  }
}
