import Context from "../../types/context";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../../types/instructionResult";
import { findExchangeAccount } from "../../utils/accounts";

export function updateOptifiMarket(context: Context,
    marketAddress: PublicKey,
    newInstrument: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            let updateTx = context.program.rpc.updateOptifiMarket(
                {
                    accounts: {
                        exchange: exchangeAddress,
                        optifiMarket: marketAddress,
                        instrument: newInstrument,
                        clock: SYSVAR_CLOCK_PUBKEY
                    }
                }
            )
            updateTx.then((res) => {
                resolve({
                    successful: true,
                    data: res as TransactionSignature
                })
            }).catch((err) => reject(err));
        }).catch((err) => reject(err));
    })
}