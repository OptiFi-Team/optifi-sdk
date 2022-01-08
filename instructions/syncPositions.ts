import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {PublicKey, TransactionSignature} from "@solana/web3.js";
import {findExchangeAccount, getDexOpenOrders} from "../utils/accounts";
import {Amm, OptifiMarket} from "../types/optifi-exchange-types";
import {SERUM_DEX_PROGRAM_ID} from "../constants";
import {findInstrumentIndexFromAMM} from "../utils/amm";
import {findAssociatedTokenAccount} from "../utils/token";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";

export default function syncPositions(context: Context,
                                      marketAddress: PublicKey,
                                      ammAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint]);
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.market.fetch(marketAddress)
                .then((marketRes) => {
                    let optifiMarket = marketRes as OptifiMarket;
                    context.program.account.amm.fetch(ammAddress).then((ammRes) => {
                        // @ts-ignore
                        let amm = ammRes as Amm;
                        findAssociatedTokenAccount(context, optifiMarket.instrumentLongSplToken, ammAddress).then(([ammLongTokenVault, _]) => {
                            findAssociatedTokenAccount(context, optifiMarket.instrumentShortSplToken, ammAddress).then(([ammShortTokenVault, _]) => {
                                getDexOpenOrders(context, optifiMarket.serumMarket, ammAddress).then(([ammOpenOrders, _]) => {
                                    let [position, instrumentIdx] = findInstrumentIndexFromAMM(context,
                                        amm,
                                        optifiMarket.instrument
                                    );
                                    let syncPositionsTx = context.program.transaction.ammSyncPositions(
                                        instrumentIdx,
                                        {
                                            accounts: {
                                                amm: ammAddress,
                                                optifiMarket: marketAddress,
                                                longTokenVault: ammLongTokenVault,
                                                shortTokenVault: ammShortTokenVault,
                                                serumMarket: serumId,
                                                openOrdersAccount: ammOpenOrders,
                                                openOrdersOwner: ammAddress
                                            }
                                        }
                                    );
                                    signAndSendTransaction(context, syncPositionsTx).then((syncRes) => {
                                        if (syncRes.resultType === TransactionResultType.Successful) {
                                            resolve({
                                                successful: true,
                                                data: syncRes.txId as TransactionSignature
                                            })
                                        } else {
                                            console.error(syncRes);
                                            reject(syncRes);
                                        }
                                    }).catch((err) => {
                                        console.error(err);
                                        reject(err);
                                    })
                                }).catch((err) => reject(err))
                            }).catch((err) => reject(err))
                        }).catch((err) => reject(err))
                    }).catch((err) => reject(err))
                })
                .catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}