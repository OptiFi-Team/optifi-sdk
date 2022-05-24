import { OptifiMarket } from "../types/optifi-exchange-types";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import Context from "../types/context";

import { initializeContext } from "../index";
import { findUserAccount } from "../utils/accounts";
import { loadOrdersAccountsForOwnerV2, loadOrdersForOwnerOnAllMarkets, Order } from "../utils/orders";
import { findOptifiMarketsWithFullData } from "../utils/market";
import { getAllOrdersForAccount } from "../utils/orderHistory";

async function getOrders(context: Context): Promise<Order[]> {
  return new Promise(async (resolve, reject) => {
    let [userAccount,] = await findUserAccount(context)
    let optifiMarkets = await findOptifiMarketsWithFullData(context)
    let [userAccountAddress,] = await findUserAccount(context)

    let openOrdersAccount = await loadOrdersAccountsForOwnerV2(context, optifiMarkets, userAccountAddress)
    let context2 = await initializeContext(undefined, undefined, undefined, undefined, { disableRetryOnRateLimit: true, commitment: "confirmed" })
    let orderHistory = await getAllOrdersForAccount(context2, userAccount,)
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

export function getAllTradesForAccount(
  context: Context,
  account: PublicKey
): Promise<Trade[]> {
  return new Promise((resolve, reject) => {
    getAllOrdersForAccount(context, account).then(async (res) => {
      // resolve(res)
      res.reverse()
      let trades: Trade[] = []

      let ClientIdFilledPercentage: number[] = await getPercentageFillPercentage(context);
      console.log(res)
      res.forEach(order => {
// divide to three situations: place order / cancel order / fill
// push to res if place order, pop res if cancel order
// after that, check if fill order by ClientIdFilledPercentage, then renew res by it

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

      for (let clientId = 0; clientId < ClientIdFilledPercentage.length; clientId++) {
        if (ClientIdFilledPercentage[clientId] != null) {
          if (ClientIdFilledPercentage[clientId] == 0) {//totally be filled, so delete from res
            let index = trades.findIndex(e => e.clientId == clientId)
            trades.splice(index, 1)
          } else {// fill potential, so renew certain trade
            let trade = trades.find(e => e.clientId == clientId)
            //@ts-ignore
            trade?.maxBaseQuantity = trade?.maxBaseQuantity * ClientIdFilledPercentage[clientId];
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
