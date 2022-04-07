import Context from "../types/context";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";
import { findOptifiExchange } from "../utils/accounts";

export default function cleanExpiredInstrumentsForUser(
    context: Context,
    userAddress: PublicKey
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findOptifiExchange(context).then(([exchangeAddress, _]) => {
            context.program.rpc.cleanExpiredInstrumentsForUser(
                {
                    accounts: {
                        userAccount: userAddress,
                        optifiExchange: exchangeAddress,
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