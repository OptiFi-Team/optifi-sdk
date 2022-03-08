import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import { PublicKey, SYSVAR_RENT_PUBKEY, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findLiquidationState, getDexOpenOrders } from "../utils/accounts";
import { OptifiMarket } from "../types/optifi-exchange-types";
import { findAssociatedTokenAccount } from "../utils/token";
import { SERUM_DEX_PROGRAM_ID } from "../constants";
import { signAndSendTransaction, TransactionResultType } from "../utils/transactions";
import { getSerumMarket } from "../utils/serum";

export default function registerLiquidationMarket(context: Context,
    userAccountAddress: PublicKey,
    marketAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.optifiMarket.fetch(marketAddress).then((marketRes) => {
                let market = marketRes as OptifiMarket;
                getDexOpenOrders(context, market.serumMarket, userAccountAddress).then(([openOrdersAccount, _]) => {
                    findAssociatedTokenAccount(context, market.instrumentLongSplToken, userAccountAddress).then(([userLongTokenAddress, _]) => {
                        findAssociatedTokenAccount(context, market.instrumentShortSplToken, userAccountAddress).then(([userShortTokenAddress, _]) => {
                            findLiquidationState(context, userAccountAddress).then(([liquidationStateAddress, _]) => {
                                getSerumMarket(context, market.serumMarket).then((serumMarket) => {

                                    console.log(openOrdersAccount.toString());
                                    context.program.rpc.registerLiquidationMarket(
                                        {
                                            accounts: {
                                                optifiExchange: exchangeAddress,
                                                userAccount: userAccountAddress,
                                                liquidationState: liquidationStateAddress,
                                                market: marketAddress,
                                                serumMarket: market.serumMarket,
                                                serumDexProgramId: new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint]),
                                                bids: serumMarket.bidsAddress,
                                                asks: serumMarket.asksAddress,
                                                eventQueue: serumMarket.decoded.eventQueue,
                                                openOrders: openOrdersAccount,
                                                openOrdersOwner: userAccountAddress, // duplicate, should be removed
                                                rent: SYSVAR_RENT_PUBKEY,
                                                userInstrumentLongTokenVault: userLongTokenAddress,
                                                userInstrumentShortTokenVault: userShortTokenAddress
                                            }
                                        }
                                    ).then((res) => {
                                        resolve({
                                            successful: true,
                                            data: res as TransactionSignature
                                        })
                                    }).catch((err) => reject(err))
                                })
                            })
                        })
                    })
                })
            }).catch((err) => reject(err))
        })
    })
}