import * as anchor from "@project-serum/anchor";
import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findUserAccount } from "../../utils/accounts";
import { getMint } from "@solana/spl-token";
import { findAssociatedTokenAccount } from "../../utils/token";

export default function addWithdrawRequest(context: Context,
    ammAddress: PublicKey,
    lpAmount: number): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findUserAccount(context).then(([userAccount, _]) => {
            context.program.account.ammAccount.fetch(ammAddress).then((ammRes) => {
                // @ts-ignore
                let amm = ammRes as Amm;
                findAssociatedTokenAccount(context, amm.lpTokenMint, userAccount).then(([userLpTokenVault, _]) => {
                    getMint(context.connection, amm.lpTokenMint).then(tokenMintInfo => {
                        context.program.rpc.addWithdrawRequest(
                            new anchor.BN(lpAmount * (10 ** tokenMintInfo.decimals)),
                            {
                                accounts: {
                                    amm: ammAddress,
                                    withdrawQueue: amm.withdrawQueue,
                                    userLpTokenVault: userLpTokenVault,
                                    userAccount: userAccount,
                                    owner: context.provider.wallet.publicKey,
                                    clock: SYSVAR_CLOCK_PUBKEY
                                }
                            }
                        ).then((res) => {
                            resolve({
                                successful: true,
                                data: res as TransactionSignature
                            })
                        }).catch((err) => reject(err))
                    }).catch((err) => reject(err))
                }).catch((err) => {
                    console.error(err);
                    reject(err);
                })
            }).catch((err) => {
                console.error(err);
                reject(err)
            })
        }).catch((err) => reject(err))
    })
}