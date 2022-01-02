import Context from "../types/context";
import {PublicKey, SYSVAR_RENT_PUBKEY, TransactionSignature} from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";
import {Amm, OptifiMarket} from "../types/optifi-exchange-types";
import {findAssociatedTokenAccount, findExchangeAccount, getDexOpenOrders} from "../utils/accounts";
import {deriveVaultNonce, getSerumMarket} from "../utils/market";
import {SERUM_DEX_PROGRAM_ID} from "../constants";
import {findOptifiMarketMintAuthPDA, findSerumPruneAuthorityPDA} from "../utils/pda";
import {findInstrumentIndexFromAMM} from "../utils/amm";

export function ammUpdateOrders(context: Context,
                                orderLimit: number,
                                ammAddress: PublicKey,
                                marketAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint])
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.amm.fetch(ammAddress).then((ammRes) => {
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
                                        findAssociatedTokenAccount(context, optifiMarket.instrumentLongSplToken).then(([userLongTokenVault, _]) => {
                                            findAssociatedTokenAccount(context, optifiMarket.instrumentShortSplToken).then(([userShortTokenVault, _]) => {
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
                                                            // TODO: check about this one
                                                            ammUsdcVault: amm.quoteTokenVault,
                                                            ammInstrumentLongTokenVault: position.longTokenVault,
                                                            ammInstrumentShortTokenVault: position.shortTokenVault,
                                                            optifiMarket: marketAddress,
                                                            serumMarket: optifiMarket.serumMarket,
                                                            openOrders: ammOpenOrders,
                                                            requestQueue: serumMarket.decoded.requestQueue,
                                                            eventQueue: serumMarket.decoded.eventQueue,
                                                            bids: serumMarket.bidsAddress,
                                                            asks: serumMarket.asksAddress,
                                                            coinMint: optifiMarket.instrumentLongSplToken,
                                                            // TODO: double check this
                                                            coinVault: userLongTokenVault,
                                                            pcVault: userShortTokenVault,
                                                            vaultSigner: vaultSigner,
                                                            orderPayerTokenAccount: userLongTokenVault,
                                                            instrumentTokenMintAuthorityPda: mintAuthAddress,
                                                            pruneAuthority: pruneAuthorityAddress,
                                                            serumDexProgramId: serumId,
                                                            rent: SYSVAR_RENT_PUBKEY
                                                        }
                                                    }
                                                )
                                            })
                                        })

                                    })
                                })
                            })
                        })
                    })
                })
            })
        })
    })
}