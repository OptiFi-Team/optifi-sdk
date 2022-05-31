import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import Context from "../types/context";

import { findUserAccount } from "../utils/accounts";
import { loadOrdersAccountsForOwnerV2, loadOrdersForOwnerOnAllMarkets, Order } from "../utils/orders";
import { findOptifiMarketsWithFullData } from "../utils/market";
import { getAllOrdersForAccount } from "../utils/orderHistory";
import { retrievRecentTxs } from "./orderHistory";
import base58, { decode } from "bs58";

const SIZE_DECIMALS = 2;

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

async function getPercentageFillPercentage(context: Context): Promise<number[]> {
  return new Promise(async (resolve, reject) => {
    let orders = await getOrders(context);

    let res: number[] = [];

    for (let i = 0; i < orders.length; i++) {
      //@ts-ignore
      res[orders[i].clientId.toNumber()] = orders[i].fillPercentage;
    }
    resolve(res);
  })
}

//refer:logAMMAccounts
async function getIOCClientId(logs: string[]) {
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
async function getIOCFillAmt(logs: string[]) {
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
async function getIOCSide(logs: string[]) {
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
async function getIOCSizeForAsk(logs: string[]) {
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

async function getIOCData(context: Context, account: PublicKey): Promise<number[]> {
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
              let clientId = await getIOCClientId(tx.meta?.logMessages)
              //@ts-ignore
              let fillAmt = await getIOCFillAmt(tx.meta?.logMessages)

              if (types == "Ask") {
                //user place Ask: market_open_orders.native_coin_total will be the amt after fill
                //(ex: open order bid 2, user ask 3,  market_open_orders.native_coin_total will be 1;
                //user ask 1 ,market_open_orders.native_coin_total will be 0
                //->ask amt - market_open_orders.native_coin_total = res

                //@ts-ignore
                let askAmt = await getIOCSizeForAsk(tx.meta?.logMessages)
                if (clientId)
                  res[clientId] = (askAmt - fillAmt) / (10 ** SIZE_DECIMALS)
              } else {
                if (clientId && fillAmt)
                  res[clientId] = fillAmt / (10 ** SIZE_DECIMALS)
              }
            }
          }
        }
      }
    }
    resolve(res);
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

      let clientIdFilledPercentage: number[] = await getPercentageFillPercentage(context);
      let clientIdIOC: number[] = await getIOCData(context, account)
      //console.log(res)
      res.forEach(order => {
        // divide to three situations: place order / cancel order / fill
        // push to res if place order, pop res if cancel order
        // after that, check if fill order by clientIdFilledPercentage, then renew res by it

        if (order.txType == "place order") {
          trades.push(new Trade({
            clientId: order.clientId,
            limit: order.limit,
            limitPrice: order.limitPrice,
            maxBaseQuantity: order.maxBaseQuantity,
            maxQuoteQuantity: order.maxQuoteQuantity,
            orderType: order.orderType,
            // selfTradeBehavior,
            side: order.side,
            timestamp: order.timestamp,
            txid: order.txid,
            gasFee: order.gasFee,
            marketAddress: order.marketAddress
          }))
        } else if (order.txType == "cancel order") {
          let index = trades.findIndex(e => e.clientId == order.clientId)
          trades.splice(index, 1)
        }
      })

      for (let clientId = 0; clientId < clientIdFilledPercentage.length; clientId++) {
        if (clientIdFilledPercentage[clientId] != null) {
          if (clientIdFilledPercentage[clientId] == 0) {//totally be filled, so delete from res
            let index = trades.findIndex(e => e.clientId == clientId)
            trades.splice(index, 1)
          } else {// fill potential, so renew certain trade
            let trade = trades.find(e => e.clientId == clientId)
            //@ts-ignore
            trade?.maxBaseQuantity = trade?.maxBaseQuantity * clientIdFilledPercentage[clientId];
          }
        }
      }

      for (let clientId = 0; clientId < clientIdIOC.length; clientId++) {
        if (clientIdIOC[clientId] != null) {
            let trade = trades.find(e => e.clientId == clientId)
            //@ts-ignore
            trade?.maxBaseQuantity = clientIdIOC[clientId];
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
