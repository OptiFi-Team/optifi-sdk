import * as anchor from "@project-serum/anchor";
import Context from "../types/context";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findOpUsdcAuth, findUserAccount, } from "../utils/accounts";
import { OPUSDC_TOKEN_MINT, USDC_DECIMALS, USDC_TOKEN_MINT } from "../constants";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import InstructionResult from "../types/instructionResult";
import { UserAccount } from "../types/optifi-exchange-types";
import { findAssociatedTokenAccount } from "../utils/token";


export default function withdraw(context: Context,
    amount: number, userAccount: UserAccount): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        let [exchangeAddress,] = await findExchangeAccount(context)
        let [userAccountAddress,] = await findUserAccount(context)
        if (userAccount !== undefined) {
            let optifiUsdcMint = new PublicKey(OPUSDC_TOKEN_MINT[context.cluster])
            let [authority] = await findOpUsdcAuth(context)
            let usdcTokenMint = new PublicKey(USDC_TOKEN_MINT[context.cluster])
            let [usdcVault] = await findAssociatedTokenAccount(context, usdcTokenMint, authority)
            let [userUsdcAccount] = await findAssociatedTokenAccount(context, usdcTokenMint)
            let [userOptifiUsdcAccount] = await findAssociatedTokenAccount(context, optifiUsdcMint)
            let unwrapUSDCInx = await context.optifiUSDCProgram.methods.unwrap(new anchor.BN(amount * (10 ** USDC_DECIMALS)),).accounts(
                {
                    authority: authority,
                    optifiUsdc: optifiUsdcMint,
                    usdcMint: usdcTokenMint,
                    usdcVault: usdcVault,
                    receiverUsdc: userUsdcAccount,
                    ownerOptifiUsdc: userOptifiUsdcAccount,
                    owner: context.provider.wallet.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    rent: SYSVAR_RENT_PUBKEY,
                }
            ).instruction()

            context.program.rpc.withdraw(
                new anchor.BN(amount * (10 ** USDC_DECIMALS)),
                {
                    accounts: {
                        optifiExchange: exchangeAddress,
                        userAccount: userAccountAddress,
                        userMarginAccountUsdc: userAccount.userMarginAccountUsdc,
                        withdrawDest: userOptifiUsdcAccount,
                        user: context.provider.wallet.publicKey,
                        tokenProgram: TOKEN_PROGRAM_ID
                    },
                    postInstructions: [unwrapUSDCInx]
                }
            ).then((res) => {
                resolve({
                    successful: true,
                    data: res as TransactionSignature
                })
            }).catch((err) => reject(err));
        } else {
            console.error("Account didn't exist ", userAccountAddress);
            reject(userAccountAddress);
        }
    })
}
