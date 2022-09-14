import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount } from "../../utils/accounts";
import { BN } from "@project-serum/anchor";
import { USDC_DECIMALS } from "../../constants";

export default function updateUserDepositLimit(context: Context,
    newAmount?: number,
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.rpc.updateUserDepositLimit(
                newAmount ? new BN(newAmount * (10 ** USDC_DECIMALS)) : null,
                {
                    accounts: {
                        optifiExchange: exchangeAddress,
                        operationAuthority: context.provider.wallet.publicKey
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