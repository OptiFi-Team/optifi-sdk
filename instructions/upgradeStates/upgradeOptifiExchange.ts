import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount } from "../../utils/accounts";
import { increaseComputeUnitsIx } from "../../utils/transactions";

export default function upgradeOptifiExchange(context: Context): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.rpc.upgradeOptifiExchange(
                {
                    accounts: {
                        optifiExchange: exchangeAddress,
                        exchangeAuthority: context.provider.wallet.publicKey
                    },
                    preInstructions: [increaseComputeUnitsIx]
                }
            ).then((res) => {
                resolve({
                    successful: true,
                    data: res as TransactionSignature
                })
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}