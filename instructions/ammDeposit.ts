import * as anchor from "@project-serum/anchor";
import Context from "../types/context";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionInstruction, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findOptifiUsdcMint, findOpUsdcAuth, findUserAccount } from "../utils/accounts";
import { AmmAccount } from "../types/optifi-exchange-types";
import { getAmmLiquidityAuthPDA } from "../utils/pda";
import { TOKEN_PROGRAM_ID, getAccount, createAssociatedTokenAccountInstruction, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import InstructionResult from "../types/instructionResult";
import { findAssociatedTokenAccount } from "../utils/token";
import { OPUSDC_TOKEN_MINT, USDC_DECIMALS, USDC_TOKEN_MINT } from "../constants";

export default function ammDeposit(context: Context,
    ammAddress: PublicKey,
    amount: number): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        let [exchangeAddress,] = await findExchangeAccount(context)
        let [userAccount,] = await findUserAccount(context)
        let ammRes = await context.program.account.ammAccount.fetch(ammAddress)
        // @ts-ignore
        let amm = ammRes as AmmAccount;

        let optifiUsdcMint = new PublicKey(OPUSDC_TOKEN_MINT[context.cluster])
        let [userQuoteTokenVault,] = await findAssociatedTokenAccount(context, optifiUsdcMint)
        let [userLpTokenVault,] = await findAssociatedTokenAccount(context, amm.lpTokenMint, userAccount)
        let instructions: TransactionInstruction[] = []
        let [authority] = await findOpUsdcAuth(context)
        let usdcTokenMint = new PublicKey(USDC_TOKEN_MINT[context.cluster])
        let [usdcVault] = await findAssociatedTokenAccount(context, usdcTokenMint, authority)
        let [ownerUsdcAccount] = await findAssociatedTokenAccount(context, usdcTokenMint)
        let [ownerOptifiUsdcAccount] = await findAssociatedTokenAccount(context, optifiUsdcMint)
        let wrapUSDCInx = await context.optifiUSDCProgram.methods.wrap(new anchor.BN(amount * (10 ** USDC_DECIMALS)),).accounts(
            {
                authority: authority,
                optifiUsdc: optifiUsdcMint,
                usdcMint: usdcTokenMint,
                usdcVault: usdcVault,
                ownerUsdc: ownerUsdcAccount,
                ownerOptifiUsdc: ownerOptifiUsdcAccount,
                owner: context.provider.wallet.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            }
        ).instruction()
        instructions.push(wrapUSDCInx)

        try {
            await getAccount(context.connection, userLpTokenVault, "processed")
        } catch (err) {
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
            context.program.rpc.ammDeposit(
                new anchor.BN(amount * (10 ** USDC_DECIMALS)),
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
    })
}