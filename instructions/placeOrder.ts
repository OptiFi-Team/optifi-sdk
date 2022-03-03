import * as anchor from "@project-serum/anchor";
import Context from "../types/context";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";
import { formPlaceOrderContext } from "../utils/orders";
import { OrderSide } from "../types/optifi-exchange-types";

export default function placeOrder(context: Context,
    marketAddress: PublicKey,
    side: OrderSide,
    limit: number,
    maxCoinQty: number,
    maxPcQty: number
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        formPlaceOrderContext(context, marketAddress).then((orderContext) => {
            console.log("side: ", side);
            console.log("limit: ", limit);
            console.log("maxCoinQty: ", maxCoinQty);
            console.log("maxPcQty: ", maxPcQty);
            context.program.rpc.placeOrder(
                side,
                new anchor.BN(limit),
                new anchor.BN(maxCoinQty),
                new anchor.BN(maxPcQty),
                {
                    accounts: orderContext
                }
            ).then((res) => {
                resolve({
                    successful: true,
                    data: res as TransactionSignature
                })
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}