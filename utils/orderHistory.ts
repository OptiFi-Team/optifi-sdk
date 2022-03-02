import { OptifiMarket } from "../types/optifi-exchange-types";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { findAMMAccounts } from "./amm";
import Context from "../types/context";
import { createAccountRentExempt } from "@project-serum/common";
import { Market, decodeInstruction } from "@project-serum/serum";
import { SERUM_DEX_PROGRAM_ID, SOL_DECIMALS, USDC_DECIMALS } from "../constants";
import bs58 from "bs58";
import { BN } from "@project-serum/anchor";

export function getAllOrdersForAccount(
  context: Context,
  account: PublicKey
): Promise<NewOrderInstruction[]> {
  return new Promise((resolve, reject) => {
    // Find all orders
    //         let userAccount = new PublicKey("")

    //         let marketAddress = new PublicKey('EdsJP7dzK3TfBSHbjDwNpXUXupgqkXn8yBvSQHwgm1A7');
    //         let market =  Market.load(context.connection, marketAddress, undefined, new PublicKey("DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY"));
    // market.then(res => {
    //     res.loadOrdersForOwner(context.connection,userAccount )
    // }).catch((err) => reject(err))

    let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint]);

    let recentOrders: NewOrderInstruction[] = [];

    const retrievRecentOrders = async () => {
      let signatures = await context.connection.getSignaturesForAddress(
        account
      );
      // console.log("signatures: ", signatures);

      // console.log("res - all txs: ", res)
      // res = res.slice(3, 4);
      //   signatures.forEach(async (signature, index) => {
      for (let signature of signatures) {
        let txid = signature.signature;
        let res = await context.connection.getTransaction(txid);
        let tx = res!;
        let inxs = tx.transaction.message.instructions;
        // console.log("inxs: ", inxs);

        inxs.forEach((inx) => {
          if (inx.data.toString().includes("GNopggZY8Jki")) {
            // console.log(txid);
            let innerInxs = tx.meta?.innerInstructions!;
            innerInxs.forEach((innerInx) => {
              innerInx.instructions.forEach((inx2) => {
                let programId =
                  tx.transaction.message.accountKeys[inx2.programIdIndex];
                // console.log("programId:", programId.toString());
                if (programId.toString() == serumId.toString()) {
                  let dataBytes = bs58.decode(inx2.data);
                  // console.log(`serum instruction for ${txid}`, innerInx);
                  try {
                    let decData = decodeInstruction(dataBytes);
                    if (decData.hasOwnProperty("newOrderV3")) {
                      let newOrder = new NewOrderInstruction(
                        decData.newOrderV3
                      );

                      let newOrderJSON = JSON.stringify(decData);
                      // console.log("newOrderJSON: ", newOrderJSON);
                      newOrder.timestamp = new Date(tx.blockTime! * 1000);
                      newOrder.txid = txid
                      newOrder.gasFee = tx.meta?.fee! / Math.pow(10, SOL_DECIMALS); // SOL has 9 decimals
                      newOrder.marketAddress = tx.transaction.message.accountKeys[inx.accounts[6]].toString() // market address index is 6 in the place order inx
                      recentOrders.push(newOrder);
                    }
                  } catch (e) {
                    console.log(e);
                  }
                }
              });
            });
          }
        });
      }
    };

    retrievRecentOrders()
      .then(() => {
        resolve(recentOrders);
      })
      .catch((err) => {
        console.error(err);
        reject(err);
      });
  });
}

export class NewOrderInstruction {
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
    marketAddress
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
  }

  public get shortForm(): string {
    return `${this.side} ${this.limit} @ ${this.limitPrice}`;
  }
}
