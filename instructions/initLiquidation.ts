import Context from "../types/context";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";
import { findExchangeAccount, findLiquidationState } from "../utils/accounts";
import { signAndSendTransaction, TransactionResultType } from "../utils/transactions";
import { UserAccount } from "../types/optifi-exchange-types";

export default function initLiquidation(context: Context, userToLiquidate: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findLiquidationState(context, userToLiquidate).then(([liquidationStateAddress, _]) => {
                context.program.account.userAccount.fetch(userToLiquidate).then((userAccount) => {
                    context.program.rpc.initLiquidation({
                        accounts: {
                            optifiExchange: exchangeAddress,
                            userAccount: userToLiquidate,
                            userMarginAccountUsdc: userAccount.userMarginAccountUsdc,
                            liquidationState: liquidationStateAddress
                        }
                    }).then((res) => {
                        resolve({
                            successful: true,
                            data: res as TransactionSignature
                        })
                    }).catch((err) => reject(err))
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}