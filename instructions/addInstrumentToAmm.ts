import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {PublicKey, SYSVAR_CLOCK_PUBKEY, TransactionSignature} from "@solana/web3.js";
import {OptifiMarket} from "../types/optifi-exchange-types";
import {findOrCreateAssociatedTokenAccount} from "../utils/token";
import {findOptifiExchange} from "../utils/accounts";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";

export default function addInstrumentToAmm(context: Context,
                                           ammAddress: PublicKey,
                                           marketAddress: PublicKey,): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        context.program.account.optifiMarket.fetch(marketAddress).then((marketRes) => {
            let optifiMarket = marketRes as OptifiMarket;
            findOrCreateAssociatedTokenAccount(context, optifiMarket.instrumentLongSplToken, ammAddress).then((ammLongTokenVault) => {
                findOrCreateAssociatedTokenAccount(context, optifiMarket.instrumentShortSplToken, ammAddress).then((ammShortTokenVault) => {
                    findOptifiExchange(context).then(([exchangeAddress, _]) => {
                        let addMarketTx = context.program.transaction.ammAddInstrument({
                            accounts: {
                                optifiExchange: exchangeAddress,
                                amm: ammAddress,
                                optifiMarket: marketAddress,
                                instrument: optifiMarket.instrument,
                                ammLongTokenVault: ammLongTokenVault,
                                ammShortTokenVault: ammShortTokenVault,
                                clock: SYSVAR_CLOCK_PUBKEY
                            }
                        });
                        signAndSendTransaction(context, addMarketTx).then((addMarketRes) => {
                            if (addMarketRes.resultType === TransactionResultType.Successful) {
                                console.log("Added instrument to AMM ", formatExplorerAddress(context,
                                    addMarketRes.txId as TransactionSignature,
                                    SolanaEntityType.Transaction)
                                );
                                resolve({
                                    successful: true,
                                    data: addMarketRes.txId as TransactionSignature
                                });
                            } else {
                                console.error(addMarketRes);
                                reject(addMarketRes);
                            }
                        }).catch((err) => {
                            console.error(err);
                            reject(err);
                        })
                    })
                })
            })
        })
    })
}