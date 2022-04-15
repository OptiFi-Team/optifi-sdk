import { OptifiMarket } from "../types/optifi-exchange-types";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { findAMMAccounts } from "./amm";
import Context from "../types/context";
import { createAccountRentExempt } from "@project-serum/common";
import { Market, decodeInstruction } from "@project-serum/serum";
import { SERUM_DEX_PROGRAM_ID, SOL_DECIMALS, USDC_DECIMALS } from "../constants";
import bs58 from "bs58";
import { BN } from "@project-serum/anchor";
import { getAllOrdersForAccount } from "./orderHistory";

export function getAllTradesForAccount(
  context: Context,
  account: PublicKey
): Promise<Trade[]> {
  return new Promise((resolve, reject) => {
    getAllOrdersForAccount(context, account).then(res => {
      // resolve(res)
      res.reverse()
      let trades: Trade[] = []
      res.forEach(order => {
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
          if (trades[index].side == "buy") {
            if (trades[index].maxQuoteQuantity <= order.cancelledQuantity!) {
              // remove the order if it's totally cancelled
              trades.splice(index, 1)
            } else {
              // calc how much was filled
              trades[index].maxQuoteQuantity -= order.cancelledQuantity!
            }
          } else {
            if (trades[index].maxBaseQuantity <= order.cancelledQuantity!) {
              // remove the order if it's totally cancelled
              trades.splice(index, 1)
            } else {
              // calc how much was filled
              trades[index].maxBaseQuantity -= order.cancelledQuantity!
            }
          }
        }
      })
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
