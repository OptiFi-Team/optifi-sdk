import * as anchor from "@project-serum/anchor";
import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findUserAccount } from "../../utils/accounts";
import { getMint } from "@solana/spl-token";
import { findAssociatedTokenAccount } from "../../utils/token";
import { AmmAccount } from "../../types/optifi-exchange-types";
import { increaseComputeUnitsIx } from "../../utils/transactions";

export default function addWithdrawRequest(context: Context,
    ammAddress: PublicKey,
    amm: AmmAccount,
    lpAmount: number): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findUserAccount(context).then(([userAccount, _]) => {
            findAssociatedTokenAccount(context, amm.lpTokenMint, userAccount).then(([userLpTokenVault, _]) => {
                getMint(context.connection, amm.lpTokenMint).then(tokenMintInfo => {
                    console.log("withdrawQueue: ", amm.withdrawQueue.toString())
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
            }).catch((err) => {
                console.error(err);
                reject(err);
            })
        }).catch((err) => reject(err))
    })
}