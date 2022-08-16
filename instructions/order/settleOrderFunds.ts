import InstructionResult from "../../types/instructionResult";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, TransactionSignature } from "@solana/web3.js";
import Context from "../../types/context";
import { UserAccount } from "../../types/optifi-exchange-types";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { increaseComputeUnitsIx } from "../../utils/transactions";
import { findMarginStressWithAsset } from "../../utils/margin";
import marginStress from "../marginStress";
import { formPlaceOrderContext } from "../../utils/orders";
import { DexInstructions } from "@project-serum/serum";

export default function settleOrderFunds(context: Context,
    marketAddress: PublicKey, userAccount: UserAccount): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        try {
            let [orderContext, asset] = await formPlaceOrderContext(context, marketAddress, userAccount)

            let ixs = [increaseComputeUnitsIx]
            ixs.push(...await marginStress(context, asset));

            let consumeEventInx = DexInstructions.consumeEvents({
                market: orderContext.serumMarket,
                openOrdersAccounts: [orderContext.openOrders],
                eventQueue: orderContext.eventQueue,
                pcFee: orderContext.userMarginAccount,
                coinFee: orderContext.userInstrumentLongTokenVault,
                limit: 65535,
                programId: orderContext.serumDexProgramId,
            })

            ixs.push(consumeEventInx)

            let settleOrderIx = context.program.instruction.settleOrderFunds({
                accounts: {
                    optifiExchange: orderContext.optifiExchange,
                    userAccount: orderContext.userAccount,
                    optifiMarket: marketAddress,
                    serumMarket: orderContext.serumMarket,
                    userSerumOpenOrders: orderContext.openOrders,
                    coinVault: orderContext.coinVault,
                    pcVault: orderContext.pcVault,
                    asks: orderContext.asks,
                    bids: orderContext.bids,
                    requestQueue: orderContext.requestQueue,
                    eventQueue: orderContext.eventQueue,
                    instrumentLongSplTokenMint: orderContext.coinMint,
                    instrumentShortSplTokenMint: orderContext.instrumentShortSplTokenMint,
                    userInstrumentLongTokenVault: orderContext.userInstrumentLongTokenVault,
                    userInstrumentShortTokenVault: orderContext.userInstrumentShortTokenVault,
                    userMarginAccount: orderContext.userMarginAccount,
                    vaultSigner: orderContext.vaultSigner,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    serumDexProgramId: orderContext.serumDexProgramId,
                    feeAccount: orderContext.feeAccount
                },
            });

            ixs.push(settleOrderIx)

            let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, orderContext.optifiExchange, asset);

            let placeOrderRes = await context.program.rpc.userMarginCalculate({
                accounts: {
                    optifiExchange: orderContext.optifiExchange,
                    marginStressAccount: marginStressAddress,
                    userAccount: orderContext.userAccount,
                    clock: SYSVAR_CLOCK_PUBKEY
                },
                instructions: ixs
            });

            resolve({
                successful: true,
                data: placeOrderRes as TransactionSignature
            })
        } catch (err) {
            reject(err)
        }
    })
}