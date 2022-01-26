import Context from "../types/context";
import {PublicKey, SYSVAR_RENT_PUBKEY, TransactionSignature} from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";
import {AmmAccount, OptifiMarket} from "../types/optifi-exchange-types";
import {findExchangeAccount, findUserAccount, getDexOpenOrders} from "../utils/accounts";
import {deriveVaultNonce} from "../utils/market";
import {SERUM_DEX_PROGRAM_ID} from "../constants";
import {findOptifiMarketMintAuthPDA, findSerumPruneAuthorityPDA} from "../utils/pda";
import {findInstrumentIndexFromAMM} from "../utils/amm";
import {findAssociatedTokenAccount} from "../utils/token";
import {TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";
import {getSerumMarket} from "../utils/serum";

export function ammUpdateOrders(context: Context,
                                orderLimit: number,
                                ammAddress: PublicKey,
                                marketAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint])
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findUserAccount(context).then(([userAccountAddress, _]) => {
                context.program.account.ammAccount.fetch(ammAddress).then((ammRes) => {
                    // @ts-ignore
                    let amm = ammRes as Amm;
                    context.program.account.optifiMarket.fetch(marketAddress).then((marketRes) => {
                        let optifiMarket = marketRes as OptifiMarket;
                        getSerumMarket(context, optifiMarket.serumMarket).then((serumMarket) => {
                            // Get the open orders account that corresponds to the actual AMM, not the user
                            getDexOpenOrders(context, optifiMarket.serumMarket, ammAddress).then(([ammOpenOrders, _]) => {
                                deriveVaultNonce(optifiMarket.serumMarket, serumId).then(([vaultSigner, vaultNonce]) => {
                                    findSerumPruneAuthorityPDA(context).then(([pruneAuthorityAddress, _]) => {
                                        findOptifiMarketMintAuthPDA(context).then(([mintAuthAddress, _]) => {
                                            findAssociatedTokenAccount(context, optifiMarket.instrumentLongSplToken, userAccountAddress).then(([userLongTokenVault, _]) => {
                                                findAssociatedTokenAccount(context, optifiMarket.instrumentShortSplToken, userAccountAddress).then(([userShortTokenVault, _]) => {
                                                    findAssociatedTokenAccount(context, optifiMarket.instrumentLongSplToken, ammAddress).then(([ammLongTokenVault, _]) => {
                                                        findAssociatedTokenAccount(context, optifiMarket.instrumentShortSplToken, ammAddress).then(([ammShortTokenVault, _]) => {
                                                            findAssociatedTokenAccount(context, serumMarket.decoded.coinMint, context.provider.wallet.publicKey).then(([orderPayerTokenAccount, _]) => {
                                                                let [position, instrumentIdx] = findInstrumentIndexFromAMM(context,
                                                                    amm,
                                                                    optifiMarket.instrument
                                                                );
                                                                let ammUpdateTx = context.program.transaction.ammUpdateOrders(
                                                                    orderLimit,
                                                                    instrumentIdx,
                                                                    {
                                                                        accounts: {
                                                                            optifiExchange: exchangeAddress,
                                                                            amm: ammAddress,
                                                                            quoteTokenVault: amm.quoteTokenVault,
                                                                            ammUsdcVault: amm.quoteTokenVault,
                                                                            ammInstrumentLongTokenVault: ammLongTokenVault,
                                                                            ammInstrumentShortTokenVault: ammShortTokenVault,
                                                                            optifiMarket: marketAddress,
                                                                            serumMarket: optifiMarket.serumMarket,
                                                                            openOrders: ammOpenOrders,
                                                                            requestQueue: serumMarket.decoded.requestQueue,
                                                                            eventQueue: serumMarket.decoded.eventQueue,
                                                                            bids: serumMarket.bidsAddress,
                                                                            asks: serumMarket.asksAddress,
                                                                            coinMint: serumMarket.decoded.baseMint,
                                                                            coinVault: serumMarket.decoded.baseVault,
                                                                            pcVault: serumMarket.decoded.quoteVault,
                                                                            vaultSigner: vaultSigner,
                                                                            orderPayerTokenAccount: orderPayerTokenAccount,
                                                                            instrumentTokenMintAuthorityPda: mintAuthAddress,
                                                                            instrumentShortSplTokenMint: optifiMarket.instrumentShortSplToken,
                                                                            pruneAuthority: pruneAuthorityAddress,
                                                                            serumDexProgramId: serumId,
                                                                            tokenProgram: TOKEN_PROGRAM_ID,
                                                                            rent: SYSVAR_RENT_PUBKEY
                                                                        }
                                                                    }
                                                                );
                                                                signAndSendTransaction(context, ammUpdateTx).then((res) => {
                                                                    if (res.resultType === TransactionResultType.Successful) {
                                                                        resolve({
                                                                            successful: true,
                                                                            data: res.txId as TransactionSignature
                                                                        });
                                                                    } else {
                                                                        console.error(res);
                                                                        reject(res);
                                                                    }
                                                                }).catch((err) => {
                                                                    console.error(err);
                                                                    reject(err);
                                                                })
                                                            }).catch((err) => {
                                                                console.error(err);
                                                                reject(err);
                                                            })
                                                        }).catch((err) => {
                                                            console.error(err);
                                                            reject(err);
                                                        })
                                                    }).catch((err) => {
                                                        console.error(err);
                                                        reject(err);
                                                    })
                                                }).catch((err) => {
                                                    console.error(err);
                                                    reject(err);
                                                })
                                            }).catch((err) => reject(err))
                                        }).catch((err) => reject(err))
                                    }).catch((err) => reject(err))
                                }).catch((err) => reject(err))
                            }).catch((err) => {
                                console.error(err);
                                reject(err)
                            })
                        }).catch((err) => {
                            console.error(err);
                            reject(err);
                        })
                    }).catch((err) => {
                        console.error(err);
                        reject(err);
                    })
                }).catch((err) => {
                    console.error(err);
                    reject(err);
                })
            }).catch((err) => {
                console.error(err);
                reject(err);
            })
        }).catch((err) => {
            console.error(err);
            reject(err);
        })
    })
}