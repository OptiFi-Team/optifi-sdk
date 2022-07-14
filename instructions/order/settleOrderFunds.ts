import InstructionResult from "../../types/instructionResult";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, Transaction, TransactionInstruction, TransactionSignature } from "@solana/web3.js";
import Context from "../../types/context";
import { formOrderContext } from "../../utils/orders";
import { OrderSide, UserAccount } from "../../types/optifi-exchange-types";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { increaseComputeUnitsIx, signAndSendTransaction, TransactionResultType } from "../../utils/transactions";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";
import { Instruction } from "@project-serum/anchor";
import { findMarginStressWithAsset } from "../../utils/margin";
import { findExchangeAccount, findUserAccount } from "../../utils/accounts";
import { SUPPORTED_ASSETS } from "../../constants";

export function getSettleOrderTx(
    context: Context,
    marketAddress: PublicKey,
    userAccount: UserAccount):
    Promise<Transaction> {
    return new Promise((resolve, reject) => {
        formOrderContext(context, marketAddress, OrderSide.Bid, userAccount).then((orderContext) => {
            let tx = context.program.transaction.settleOrderFunds({
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
                    serumDexProgramId: orderContext.serumDexProgramId
                },
                preInstructions: [increaseComputeUnitsIx]
            });
            resolve(tx);
        }).catch((err) => {
            console.error(err);
            reject(err);
        })
    })
}


function getSettleOrderIx(
    context: Context,
    marketAddress: PublicKey,
    userAccount: UserAccount):
    Promise<TransactionInstruction> {
    return new Promise((resolve, reject) => {
        formOrderContext(context, marketAddress, OrderSide.Bid, userAccount).then(async (orderContext) => {
            let ix = await context.program.instruction.settleOrderFunds({
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
                    serumDexProgramId: orderContext.serumDexProgramId
                },
            });
            resolve(ix);
        }).catch((err) => {
            console.error(err);
            reject(err);
        })
    })
}


export default function settleOrderFunds(context: Context,
    marketAddresses: PublicKey[], userAccount: UserAccount): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {

        let ixs = [increaseComputeUnitsIx]

        for (let marketAddress of marketAddresses) {
            ixs.push(await getSettleOrderIx(context, marketAddress, userAccount));
        };

        let [exchangeAddress, _] = await findExchangeAccount(context);

        let [userAccountAddress,] = await findUserAccount(context)

        let placeOrderRes;

        for (let i = 0; i < SUPPORTED_ASSETS.length; i++) {

            let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, SUPPORTED_ASSETS[i]);

            if (i == SUPPORTED_ASSETS.length - 1) {
                placeOrderRes = await context.program.rpc.userMarginCalculate({
                    accounts: {
                        optifiExchange: exchangeAddress,
                        marginStressAccount: marginStressAddress,
                        userAccount: userAccountAddress,
                        clock: SYSVAR_CLOCK_PUBKEY
                    },
                    instructions: ixs
                });
            } else {
                ixs.push(
                    context.program.instruction.userMarginCalculate({
                        accounts: {
                            optifiExchange: exchangeAddress,
                            marginStressAccount: marginStressAddress,
                            userAccount: userAccountAddress,
                            clock: SYSVAR_CLOCK_PUBKEY
                        }
                    })
                );
            }
        }

        resolve({
            successful: true,
            data: placeOrderRes as TransactionSignature
        })
    })
}