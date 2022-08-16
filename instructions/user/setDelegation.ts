import Context from "../../types/context";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../../types/instructionResult";
import { findExchangeAccount, findUserAccount } from "../../utils/accounts";


export default function setDelegation(context: Context, delegatee: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findUserAccount(context).then(([userAccountAddress, _]) => {
                context.program.rpc.setDelegation(
                    delegatee,
                    {
                        accounts: {
                            optifiExchange: exchangeAddress,
                            userAccount: userAccountAddress,
                            user: context.provider.wallet.publicKey,
                        }
                    }).then((res) => {
                        resolve({
                            successful: true,
                            data: res as TransactionSignature
                        })
                    }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}
