import * as anchor from "@project-serum/anchor";
import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findUserAccount } from "../../utils/accounts";
import { getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { findAssociatedTokenAccount } from "../../utils/token";
import { getAmmLiquidityAuthPDA } from "../../utils/pda";
import { USDC_TOKEN_MINT } from "../../constants";
import { findMarginStressWithAsset } from "../../utils/margin";
import { UserAccount } from "../../types/optifi-exchange-types";
import { increaseComputeUnitsIx } from "../../utils/transactions";

export default function consumeWithdrawRequestQueue(context: Context,
    ammAddress: PublicKey,
    userAccount: PublicKey,
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.exchange.fetch(exchangeAddress).then(exchangeInfo => {
                getAmmLiquidityAuthPDA(context).then(([liquidityAuthPDA, _]) => {
                    context.program.account.ammAccount.fetch(ammAddress).then((ammRes) => {
                        // @ts-ignore
                        let amm = ammRes as Amm;
                        context.program.account.userAccount.fetch(userAccount).then((userAccountRes) => {
                            // @ts-ignore
                            let user = userAccountRes as UserAccount;
                            // console.log(user.owner.toString())

                            findAssociatedTokenAccount(context, new PublicKey(USDC_TOKEN_MINT[context.endpoint]), user.owner).then(([userQuoteTokenVault, _]) => {
                                // console.log(userQuoteTokenVault.toString())

                                findAssociatedTokenAccount(context, amm.lpTokenMint, userAccount).then(async ([userLpTokenVault, _]) => {
                                    let [marginStressAddress,] = await findMarginStressWithAsset(context, exchangeAddress, amm.asset)
                                    console.log("userLpTokenVault: ", userLpTokenVault.toString())
                                    context.program.rpc.consumeWithdrawQueue(
                                        {
                                            accounts: {
                                                optifiExchange: exchangeAddress,
                                                usdcFeePool: exchangeInfo.usdcFeePool,
                                                amm: ammAddress,
                                                marginStressAccount: marginStressAddress,
                                                withdrawQueue: amm.withdrawQueue,
                                                ammQuoteTokenVault: amm.quoteTokenVault,
                                                userQuoteTokenVault: userQuoteTokenVault,
                                                lpTokenMint: amm.lpTokenMint,
                                                ammLiquidityAuth: liquidityAuthPDA,
                                                userLpTokenVault: userLpTokenVault,
                                                userAccount: userAccount,
                                                tokenProgram: TOKEN_PROGRAM_ID,
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
                            }).catch((err) => reject(err))
                        }).catch((err) => reject(err))
                    }).catch((err) => reject(err))
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}