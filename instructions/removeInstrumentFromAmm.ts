import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {PublicKey, SYSVAR_CLOCK_PUBKEY, TransactionSignature} from "@solana/web3.js";
import {OptifiMarket} from "../types/optifi-exchange-types";
import {findOptifiExchange} from "../utils/accounts";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";

export default function removeInstrumentFromAmm(context: Context,
                                                ammAddress: PublicKey,
                                                marketAddress: PublicKey,): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        context.program.account.optifiMarket.fetch(marketAddress).then((marketRes) => {
            let optifiMarket = marketRes as OptifiMarket;
            findOptifiExchange(context).then(([exchangeAddress, _]) => {
                let removeMarketTx = context.program.transaction.ammRemoveInstrument({
                    accounts: {
                        optifiExchange: exchangeAddress,
                        amm: ammAddress,
                        optifiMarket: marketAddress,
                        instrument: optifiMarket.instrument,
                        clock: SYSVAR_CLOCK_PUBKEY
                    }
                });
                signAndSendTransaction(context, removeMarketTx).then((removeMarketRes) => {
                    if (removeMarketRes.resultType === TransactionResultType.Successful) {
                        console.log("Removed instrument from AMM ", formatExplorerAddress(context,
                            removeMarketRes.txId as TransactionSignature,
                            SolanaEntityType.Transaction)
                        );
                        resolve({
                            successful: true,
                            data: removeMarketRes.txId as TransactionSignature
                        });
                    } else {
                        console.error(removeMarketRes);
                        reject(removeMarketRes);
                    }
                }).catch((err) => {
                    console.error(err);
                    reject(err);
                })
            })
        })
    })
}