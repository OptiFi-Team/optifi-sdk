import * as anchor from "@project-serum/anchor";
import Context from "../types/context";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";
import { formOrderContext } from "../utils/orders";
import { OrderSide } from "../types/optifi-exchange-types";
import { COIN_LOT_SIZE, MAX_COIN_QTY, MAX_PC_QTY, PC_LOT_SIZE } from "../constants";
import { signAndSendTransaction, TransactionResultType } from "../utils/transactions";
import { getSerumMarket } from "../utils/serum";

export default function placeOrder(context: Context,
    marketAddress: PublicKey,
    side: OrderSide,
    limit: number,
    maxCoinQty: number,
    maxPcQty: number
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        formOrderContext(context, marketAddress, side).then((orderContext) => {
            console.log("side: ", side);
            console.log("limit: ", limit);
            console.log("maxCoinQty: ", maxCoinQty);
            console.log("maxPcQty: ", maxPcQty);
            let placeOrderTx = context.program.transaction.placeOrder(
                side,
                new anchor.BN(limit),
                new anchor.BN(maxCoinQty),
                new anchor.BN(maxPcQty),
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
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}