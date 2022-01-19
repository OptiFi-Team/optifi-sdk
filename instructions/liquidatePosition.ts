import Context from "../types/context";
import {PublicKey, SYSVAR_RENT_PUBKEY, TransactionSignature} from "@solana/web3.js";
import {findExchangeAccount, findLiquidationState, getDexOpenOrders} from "../utils/accounts";
import {OptifiMarket} from "../types/optifi-exchange-types";
import {findAssociatedTokenAccount} from "../utils/token";
import {SERUM_DEX_PROGRAM_ID} from "../constants";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";
import {TOKEN_PROGRAM_ID} from "@solana/spl-token";
import InstructionResult from "../types/instructionResult";
import {getSerumMarket} from "../utils/serum";

export default function liquidatePosition(context: Context,
                                          userAccountAddress: PublicKey,
                                          marketAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.optifiMarket.fetch(marketAddress).then((marketRes) => {
                let market = marketRes as OptifiMarket;
                getDexOpenOrders(context, market.serumMarket, userAccountAddress).then((openOrdersAccount) => {
                    findAssociatedTokenAccount(context, market.instrumentLongSplToken, userAccountAddress).then(([userLongTokenAddress, _]) => {
                        findAssociatedTokenAccount(context, market.instrumentShortSplToken, userAccountAddress).then(([userShortTokenAddress, _]) => {
                            findLiquidationState(context, userAccountAddress).then(([liquidationStateAddress, _]) => {
                                getSerumMarket(context, market.serumMarket).then((serumMarket) => {
                                    let registerLiquidateTx = context.program.transaction.liquidatePosition(
                                        {
                                            accounts: {
                                                exchange: exchangeAddress,
                                                userAccount: userAccountAddress,
                                                liquidationState: liquidationStateAddress,
                                                optifiMarket: marketAddress,
                                                serumMarket: market.serumMarket,
                                                serumDexProgramId: new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint]),
                                                bids: serumMarket.bidsAddress,
                                                asks: serumMarket.asksAddress,
                                                eventQueue: serumMarket.decoded.eventQueue,
                                                requestQueue: serumMarket.decoded.requestQueue,
                                                openOrders: openOrdersAccount,
                                                openOrdersOwner: userAccountAddress,
                                                rent: SYSVAR_RENT_PUBKEY,
                                                coinVault: serumMarket.decoded.coinVault,
                                                pcVault: serumMarket.decoded.pcVault,
                                                tokenProgram: TOKEN_PROGRAM_ID,
                                                liquidator: context.provider.wallet.publicKey,
                                            }
                                        }
                                    );
                                    signAndSendTransaction(context, registerLiquidateTx).then((registerLiquidateRes) => {
                                        if (registerLiquidateRes.resultType === TransactionResultType.Successful) {
                                            resolve({
                                                successful: true,
                                                data: registerLiquidateRes.txId as TransactionSignature
                                            })
                                        } else {
                                            console.error(registerLiquidateRes);
                                            reject(registerLiquidateRes);
                                        }
                                    })
                                })
                            })
                        })
                    })
                })
            }).catch((err) => reject(err))
        })
    })
}