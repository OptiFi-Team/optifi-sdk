import * as anchor from "@project-serum/anchor";
import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY, SYSVAR_RENT_PUBKEY, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findOpUsdcAuth, findUserAccount } from "../../utils/accounts";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { findAssociatedTokenAccount } from "../../utils/token";
import { getAmmLiquidityAuthPDA } from "../../utils/pda";
import { OPUSDC_TOKEN_MINT, USDC_TOKEN_MINT } from "../../constants";
import { findMarginStressWithAsset } from "../../utils/margin";
import { UserAccount } from "../../types/optifi-exchange-types";
import { increaseComputeUnitsIx } from "../../utils/transactions";
import marginStress from "../marginStress/marginStress";

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


                            findAssociatedTokenAccount(context, amm.lpTokenMint, userAccount).then(async ([userLpTokenVault, _]) => {
                                let [marginStressAddress,] = await findMarginStressWithAsset(context, exchangeAddress, amm.asset)

                                let ixs = [increaseComputeUnitsIx]
                                ixs.push(...await marginStress(context, amm.asset));

                                let optifiUsdcMint = new PublicKey(OPUSDC_TOKEN_MINT[context.cluster])
                                let [userQuoteTokenVault,] = await findAssociatedTokenAccount(context, optifiUsdcMint, user.owner)
                                let [authority] = await findOpUsdcAuth(context)
                                let usdcTokenMint = new PublicKey(USDC_TOKEN_MINT[context.cluster])
                                let [usdcVault] = await findAssociatedTokenAccount(context, usdcTokenMint, authority)
                                let [ownerUsdcAccount] = await findAssociatedTokenAccount(context, usdcTokenMint, user.owner)

                                console.log("liquidityAuthPDA: ", liquidityAuthPDA.toBase58())
                                console.log("amm.quoteTokenVault: ", amm.quoteTokenVault.toBase58())

                                // console.log("userLpTokenVault: ", userLpTokenVault.toString())
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

                                            authority: authority,
                                            optifiUsdc: optifiUsdcMint,
                                            usdcMint: usdcTokenMint,
                                            usdcVault: usdcVault,
                                            userUsdcTokenVault: ownerUsdcAccount,
                                            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                                            systemProgram: SystemProgram.programId,
                                            rent: SYSVAR_RENT_PUBKEY,
                                            optifiUsdcProgram: context.optifiUSDCProgram.programId
                                        },
                                        preInstructions: ixs,
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
    })
}