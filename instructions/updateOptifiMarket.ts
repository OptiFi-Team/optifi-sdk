import Context from "../types/context";
import {PublicKey, SYSVAR_CLOCK_PUBKEY, TransactionSignature} from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";
import {findExchangeAccount} from "../utils/accounts";
import {OptifiMarket} from "../types/optifi-exchange-types";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";

export function updateOptifiMarket(context: Context,
                                   marketAddress: PublicKey,
                                   newInstrument: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.market.fetch(marketAddress).then((marketRes) => {
                let optifiMarket = marketRes as OptifiMarket;
                let updateTx = context.program.transaction.updateOptifiMarket(
                    {
                        accounts: {
                            exchange: exchangeAddress,
                            optifiMarket: marketAddress,
                            serumMarket: optifiMarket.serumMarket,
                            instrument: newInstrument,
                            clock: SYSVAR_CLOCK_PUBKEY
                        }
                    }
                )
                signAndSendTransaction(context, updateTx).then((res) => {
                    if (res.resultType === TransactionResultType.Successful) {
                        resolve({
                            successful: true,
                            data: res.txId as TransactionSignature
                        })
                    } else {
                        console.error(res);
                        reject(res);
                    }
                }).catch((err) => reject(err))
            }).catch((err) => reject(err));
        }).catch((err) => reject(err));
    })
}