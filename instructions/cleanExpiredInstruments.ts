import Context from "../types/context";
import { SYSVAR_CLOCK_PUBKEY, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";
import { findOptifiExchange } from "../utils/accounts";

export default function cleanExpiredInstruments(
    context: Context,
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findOptifiExchange(context).then(([exchangeAddress, _]) => {
            context.program.rpc.cleanExpiredInstruments(
                {
                    accounts: {
                        optifiExchange: exchangeAddress,
                        clock: SYSVAR_CLOCK_PUBKEY
                    },
                }
            ).then((res) => {
                resolve({
                    successful: true,
                    data: res as TransactionSignature
                })
            }).catch((err) => reject(err))
        }).catch((err) => reject(err));
    });
}