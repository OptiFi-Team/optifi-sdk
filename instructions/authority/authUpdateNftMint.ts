import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount } from "../../utils/accounts";

export default function updateOgNftMint(context: Context,
    ogNftMint?: PublicKey,
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.rpc.updateOgNftMint(
                ogNftMint ? ogNftMint : null,
                {
                    accounts: {
                        optifiExchange: exchangeAddress,
                        authority: context.provider.wallet.publicKey
                    }
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