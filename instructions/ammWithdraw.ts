import * as anchor from "@project-serum/anchor";
import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {PublicKey, TransactionSignature} from "@solana/web3.js";
import {findExchangeAccount, findUserAccount} from "../utils/accounts";
import {Amm} from "../types/optifi-exchange-types";
import {TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";
import {findAssociatedTokenAccount} from "../utils/token";
import {getAmmLiquidityAuthPDA} from "../utils/pda";

export default function ammWithdraw(context: Context,
                                    ammAddress: PublicKey,
                                    amount: number): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findUserAccount(context).then(([userAccountAddress, _]) => {
                getAmmLiquidityAuthPDA(context).then(([liquidityAuthPDA, _]) => {
                    context.program.account.amm.fetch(ammAddress).then((ammRes) => {
                        // @ts-ignore
                        let amm = ammRes as Amm;
                        findAssociatedTokenAccount(context, amm.quoteTokenMint).then(([userQuoteTokenVault, _]) => {
                            findAssociatedTokenAccount(context, amm.lpTokenMint).then(([userLpTokenVault, _]) => {
                                let ammWithdrawTx = context.program.transaction.ammWithdraw(
                                    new anchor.BN(amount),
                                    {
                                        accounts: {
                                            optifiExchange: exchangeAddress,
                                            amm: ammAddress,
                                            userAccount: userAccountAddress,
                                            ammQuoteTokenVault: amm.quoteTokenVault,
                                            userQuoteTokenVault: userQuoteTokenVault,
                                            lpTokenMint: amm.lpTokenMint,
                                            userLpTokenVault: userLpTokenVault,
                                            user: context.provider.wallet.publicKey,
                                            tokenProgram: TOKEN_PROGRAM_ID,
                                            ammLiquidityAuth: liquidityAuthPDA
                                        }
                                    }
                                );
                                signAndSendTransaction(context, ammWithdrawTx).then((ammWithdrawRes) => {
                                    if (ammWithdrawRes.resultType === TransactionResultType.Successful) {
                                        resolve({
                                            successful: true,
                                            data: ammWithdrawRes.txId as TransactionSignature
                                        })
                                    } else {
                                        console.error(ammWithdrawRes);
                                        reject(ammWithdrawRes);
                                    }
                                }).catch((err) => {
                                    console.error(err);
                                    reject(err);
                                })
                            }).catch((err) => {
                                console.error(err);
                                reject(err);
                            })
                        }).catch((err) => {
                            console.error(err);
                            reject(err)
                        })
                    }).catch((err) => reject(err))
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}