import { OptifiMarket } from "../types/optifi-exchange-types";
import { PublicKey, Keypair, Connection, TransactionResponse } from "@solana/web3.js";
import { findAMMAccounts } from "./amm";
import Context from "../types/context";
import { createAccountRentExempt } from "@project-serum/common";
import { Market, decodeInstruction } from "@project-serum/serum";
import { SERUM_DEX_PROGRAM_ID, SOL_DECIMALS, USDC_DECIMALS } from "../constants";
import bs58 from "bs58";
import { BN } from "@project-serum/anchor";

const placeOrderSignature = "CMPapPMYm4iS"
const cancelOrderSignature = "fRxJkFxjTpaL"
const cancelOrderByClientOrderIdSignature = "264TKrGFGtaFb"

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

const parseOrderTxs = async (txs: TransactionResponse[], serumId: PublicKey): Promise<OrderInstruction[]> => {
  let orderTxs: OrderInstruction[] = [];

  for (let tx of txs) {
    let inxs = tx.transaction.message.instructions;
    inxs.forEach((inx) => {
      // console.log("inx.data: ", inx.data)
      // console.log("txid: ", tx.transaction.signatures[0]);

      if (inx.data.includes(placeOrderSignature) || inx.data.includes(cancelOrderByClientOrderIdSignature)) {
        // console.log(txid);
        let innerInxs = tx.meta?.innerInstructions!;
        innerInxs.forEach((innerInx) => {
          innerInx.instructions.forEach((inx2) => {
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

                  // let newOrderJSON = JSON.stringify(decData);
                  // console.log("newOrderJSON: ", newOrderJSON);
                  record.timestamp = new Date(tx.blockTime! * 1000);
                  record.txid = tx.transaction.signatures[0]
                  record.gasFee = tx.meta?.fee! / Math.pow(10, SOL_DECIMALS); // SOL has 9 decimals
                  record.marketAddress = tx.transaction.message.accountKeys[inx.accounts[7]].toString() // market address index is 7 in the place order inx
                  record.txType = "place order"
                  orderTxs.push(Object.assign({}, record));
                } else if (decData.hasOwnProperty("cancelOrderByClientIdV2")) {

                  // get the orginal order details
                  let orginalOrder = orderTxs.find(e => e.clientId == decData.cancelOrderByClientIdV2.clientId)!
                  let record = JSON.parse(JSON.stringify(orginalOrder));

                  // console.log("tx.meta?.preTokenBalances: ", tx.meta?.preTokenBalances)
                  // console.log("tx.meta?.postTokenBalances: ", tx.meta?.postTokenBalances)
                  // console.log("inx.accounts: ", inx.accounts)
                  //  tx.transaction.message.accountKeys[inx.accounts[6]].toString()
                  let userMarginAccountIndex = inx.accounts[3]
                  let longTokenVaultIndex = inx.accounts[4]
                  let cancelledQuantity: number = 0
                  if (record.side == "buy") {
                    let preTokenAccount = tx.meta?.preTokenBalances?.find(e => e.accountIndex == userMarginAccountIndex)!
                    let postTokenAccount = tx.meta?.postTokenBalances?.find(e => e.accountIndex == userMarginAccountIndex)!
                    cancelledQuantity = parseFloat(postTokenAccount.uiTokenAmount.uiAmountString!) - parseFloat(preTokenAccount.uiTokenAmount.uiAmountString!)
                  } else {
                    let preTokenAccount = tx.meta?.preTokenBalances?.find(e => e.accountIndex == longTokenVaultIndex)!
                    let postTokenAccount = tx.meta?.postTokenBalances?.find(e => e.accountIndex == longTokenVaultIndex)!
                    cancelledQuantity = parseFloat(postTokenAccount.uiTokenAmount.uiAmountString!) - parseFloat(preTokenAccount.uiTokenAmount.uiAmountString!)
                  }

                  // console.log("cancelledAmount: ", cancelledAmount)
                  record.cancelledQuantity = cancelledQuantity
                  record.timestamp = new Date(tx.blockTime! * 1000);
                  record.txid = tx.transaction.signatures[0]
                  record.gasFee = tx.meta?.fee! / Math.pow(10, SOL_DECIMALS); // SOL has 9 decimals
                  record.marketAddress = tx.transaction.message.accountKeys[inx.accounts[6]].toString() // market address index is 6 in the place order inx
                  record.txType = "cancel order"
                  orderTxs.push(record);
                }
              } catch (e) {
                console.log(e);
              }
            }
          });
        });
      }
    });
    // }
  };
  return orderTxs
}

export function getAllOrdersForAccount(
  context: Context,
  account: PublicKey
): Promise<OrderInstruction[]> {
  return new Promise(async (resolve, reject) => {
    try {
      // get all recent txs
      let allTxs = await retrievRecentTxs(context, account)
      // sort them in ascending time order for btter parsing process
      allTxs = allTxs.reverse()
      // parse order txs, inlcuding place order, cancel order
      let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint]);
      let orderTxs = await parseOrderTxs(allTxs, serumId)
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
    cancelledQuantity
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
  }

  public get shortForm(): string {
    return `${this.side} ${this.limit} @ ${this.limitPrice}`;
  }
}
