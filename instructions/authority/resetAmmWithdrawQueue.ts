import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount } from "../../utils/accounts";
import * as anchor from "@project-serum/anchor";

export default function resetAmmWithdrawQueue(context: Context,
    ammAddress: PublicKey,
    userAccount: PublicKey
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.ammAccount.fetch(ammAddress).then(async (ammRes) => {
                // @ts-ignore
                let amm = ammRes as Amm;
                const withdrawQueueWallet = anchor.web3.Keypair.generate();

                context.program.rpc.resetAmmWithdrawQueue(
                    {
                        accounts: {
                            optifiExchange: exchangeAddress,
                            authority: context.provider.wallet.publicKey,
                            amm: ammAddress,
                            withdrawQueue: amm.withdrawQueue,
                            newWithdrawQueue: withdrawQueueWallet.publicKey,
                            userAccount: userAccount
                        },
                        signers: [withdrawQueueWallet],
                        instructions: [
                            await context.program.account.ammWithdrawRequestQueue.createInstruction(
                                withdrawQueueWallet,
                                context.program.account.ammWithdrawRequestQueue.size + 8
                            ),
                            // SystemProgram.createAccount({
                            //     fromPubkey: context.provider.wallet.publicKey,
                            //     newAccountPubkey: ammUSDCTokenVault.publicKey,
                            //     lamports: accountMin,
                            //     space: AccountLayout.span,
                            //     programId: TOKEN_PROGRAM_ID
                            // }),
                        ]
                    }
                ).then((res) => {
                    resolve({
                        successful: true,
                        data: res as TransactionSignature
                    })
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}