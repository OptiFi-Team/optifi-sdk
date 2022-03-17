import * as anchor from "@project-serum/anchor";
import Context from "../types/context";
import { PublicKey, Transaction, TransactionInstruction, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";
import { formPlaceOrderContext } from "../utils/orders";
import { OrderSide } from "../types/optifi-exchange-types";
import marginStress from "./marginStress";
import { signAndSendTransaction, TransactionResultType } from "../utils/transactions";
import { isUserInitializedOnMarket } from "../utils/market";
import { createInitUserOnOptifiMarketInstruciton } from "./initUserOnOptifiMarket";

export default function placeOrder(context: Context,
    marketAddress: PublicKey,
    side: OrderSide,
    limit: number,
    maxCoinQty: number,
    maxPcQty: number
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        formPlaceOrderContext(context, marketAddress).then(async ([orderContext, asset]) => {
            console.log("side: ", side);
            console.log("limit: ", limit);
            console.log("maxCoinQty: ", maxCoinQty);
            console.log("maxPcQty: ", maxPcQty);


            let ix = await marginStress(context, asset);

            context.program.rpc.placeOrder(
                side,
                new anchor.BN(limit),
                new anchor.BN(maxCoinQty),
                new anchor.BN(maxPcQty),
                new anchor.BN(new Date().getTime() / 1000), // use current timestamp as client defined order id
                {
                    accounts: orderContext,
                    instructions: ix
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

export function placeOrderWithInitUserOnMarket(context: Context,
    marketAddress: PublicKey,
    side: OrderSide,
    limit: number,
    maxCoinQty: number,
    maxPcQty: number
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        let [orderContext, asset] = await formPlaceOrderContext(context, marketAddress)
        console.log("side: ", side);
        console.log("limit: ", limit);
        console.log("maxCoinQty: ", maxCoinQty);
        console.log("maxPcQty: ", maxPcQty);

        let isStarted = await isUserInitializedOnMarket(context, marketAddress, "processed")
        console.log("isStarted: ", isStarted)
        let ix = await marginStress(context, asset);
        // if user hasn't been initialized on the market, add the inx to the tx
        if (!isStarted) {
            console.log("adding createInitUserOnOptifiMarketInstruciton")
            let i = await createInitUserOnOptifiMarketInstruciton(context, marketAddress)
            console.log(i)
            i.forEach(i => console.log(i.keys.map(e => e.pubkey.toString())))

            ix.push(...i)
        }

        context.program.rpc.placeOrder(
            side,
            new anchor.BN(limit),
            new anchor.BN(maxCoinQty),
            new anchor.BN(maxPcQty),
            new anchor.BN(new Date().getTime() / 1000), // use current timestamp as client defined order id
            {
                accounts: orderContext,
                instructions: ix
            }
        ).then((res) => {
            resolve({
                successful: true,
                data: res as TransactionSignature
            })
        }).catch((err) => reject(err))

        //     poolTx.add(
        //         a
        //     )
        // signAndSendTransaction(context, poolTx, [])
        //     .then((res) => {
        //         // if (res.resultType === TransactionResultType.Successful) {
        //         //     console.debug("Created USDC pool")
        //         //     resolve(res);
        //         // } else {
        //         //     console.error("Pool initialization was not successful", res);
        //         //     reject(res);
        //         // }
        //     }).catch((err) => reject(err))




    })
}