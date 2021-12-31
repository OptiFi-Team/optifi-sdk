import * as anchor from "@project-serum/anchor";
import Context from "../types/context";
import {PublicKey, TransactionSignature} from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";
import {formOrderContext} from "../utils/orders";
import {OrderSide} from "../types/optifi-exchange-types";
import {getSerumMarket} from "../utils/market";
import {COIN_LOT_SIZE, PC_LOT_SIZE} from "../constants";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";

export function placeOrder(context: Context,
                           marketAddress: PublicKey,
                           side: OrderSide,
                           limit: number): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        formOrderContext(context, marketAddress).then((orderContext) => {
            getSerumMarket(context, marketAddress).then((serumMarket) => {
                let maxCoinQty = new anchor.BN(8 * COIN_LOT_SIZE);
                let maxPcQty = new anchor.BN(8 * PC_LOT_SIZE);
                let placeOrderTx = context.program.transaction.placeOrder(
                    side,
                    new anchor.BN(limit),
                    maxCoinQty,
                    maxPcQty,
                    {
                        accounts: orderContext
                    }
                );
                signAndSendTransaction(context, placeOrderTx).then((res) => {
                    if (res.resultType === TransactionResultType.Successful) {
                        resolve({
                            successful: true,
                            data: res.txId as TransactionSignature
                        })
                    } else {
                        console.error(res);
                        reject(res);
                    }
                })
            })

        })
    })
}