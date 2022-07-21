import * as anchor from "@project-serum/anchor";
import Context from "../types/context";
import { Account, PublicKey, SystemProgram, TransactionInstruction, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findUserAccount } from "../utils/accounts";
import { AmmAccount } from "../types/optifi-exchange-types";
import { getAmmLiquidityAuthPDA } from "../utils/pda";
import { TOKEN_PROGRAM_ID, getAccount, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { signAndSendTransaction, TransactionResultType } from "../utils/transactions";
import InstructionResult from "../types/instructionResult";
import { findAssociatedTokenAccount } from "../utils/token";
import { USDC_TOKEN_MINT } from "../constants";

export default function ammDeposit(context: Context,
    ammAddress: PublicKey,
    amount: number): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findUserAccount(context).then(([userAccount, _]) => {
                context.program.account.ammAccount.fetch(ammAddress).then((ammRes) => {
                    // @ts-ignore
                    let amm = ammRes as AmmAccount;
                    findAssociatedTokenAccount(context, new PublicKey(USDC_TOKEN_MINT[context.cluster])).then(([userQuoteTokenVault, _]) => {
                        findAssociatedTokenAccount(context, amm.lpTokenMint, userAccount).then(async ([userLpTokenVault, _]) => {
                            let instructions: TransactionInstruction[] = []
                            try {
                                let accountInfo = await getAccount(context.connection, userLpTokenVault, "processed")
                                console.log("user lp token accountInfo: ", accountInfo)
                            } catch (err) {
                                // console.log("err: ", err)
                                if (`${err}`.includes("TokenAccountNotFoundError")) {
                                    console.log("adding init lp token account inx")
                                    instructions.push(
                                        createAssociatedTokenAccountInstruction(
                                            context.provider.wallet.publicKey,
                                            userLpTokenVault,
                                            userAccount,
                                            ammRes.lpTokenMint,
                                        )
                                    )
                                } else {
                                    reject(err)
                                }
                            }
                            getAmmLiquidityAuthPDA(context).then(([liquidityAuthPDA, _]) => {
                                context.connection.getTokenAccountBalance(userQuoteTokenVault).then(tokenAmount => {
                                    context.program.rpc.ammDeposit(
                                        new anchor.BN(amount * (10 ** tokenAmount.value.decimals)),
                                        {
                                            accounts: {
                                                optifiExchange: exchangeAddress,
                                                amm: ammAddress,
                                                ammQuoteTokenVault: amm.quoteTokenVault,
                                                userQuoteTokenVault: userQuoteTokenVault,
                                                lpTokenMint: amm.lpTokenMint,
                                                ammLiquidityAuth: liquidityAuthPDA,
                                                userLpTokenVault: userLpTokenVault,
                                                userAccount: userAccount,
                                                owner: context.provider.wallet.publicKey,
                                                tokenProgram: TOKEN_PROGRAM_ID
                                            },
                                            instructions: instructions,
                                        }
                                    ).then((res) => {
                                        resolve({
                                            successful: true,
                                            data: res as TransactionSignature
                                        })
                                    }).catch((err) => reject(err))
                                }).catch((err) => reject(err))
                            }).catch((err) => reject(err))
                        }).catch((err) => reject(err))
                    }).catch((err) => reject(err))
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}