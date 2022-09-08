import * as anchor from "@project-serum/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionSignature } from "@solana/web3.js";
import { OPUSDC_TOKEN_MINT, USDC_DECIMALS, USDC_TOKEN_MINT } from "../constants";
import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import { UserAccount } from "../types/optifi-exchange-types";
import { findExchangeAccount, findOpUsdcAuth, findUserAccount, } from "../utils/accounts";
import { findAssociatedTokenAccount } from "../utils/token";

export default function deposit(context: Context, amount: number, userAccount: UserAccount): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        try {
            let [userAccountAddress, _] = await findUserAccount(context)
            if (userAccount !== undefined) {
                let [exchangeAddress,] = await findExchangeAccount(context)
                let optifiUsdcMint = new PublicKey(OPUSDC_TOKEN_MINT[context.cluster])
                let [authority] = await findOpUsdcAuth(context)
                let usdcTokenMint = new PublicKey(USDC_TOKEN_MINT[context.cluster])
                let [usdcVault] = await findAssociatedTokenAccount(context, usdcTokenMint, authority)
                let [userUsdcAccount] = await findAssociatedTokenAccount(context, usdcTokenMint)
                let [userOptifiUsdcAccount] = await findAssociatedTokenAccount(context, optifiUsdcMint)
                let wrapUSDCInx = await context.optifiUSDCProgram.methods.wrap(new anchor.BN(amount * (10 ** USDC_DECIMALS)),).accounts(
                    {
                        authority: authority,
                        optifiUsdc: optifiUsdcMint,
                        usdcMint: usdcTokenMint,
                        usdcVault: usdcVault,
                        ownerUsdc: userUsdcAccount,
                        ownerOptifiUsdc: userOptifiUsdcAccount,
                        owner: context.provider.wallet.publicKey,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                        rent: SYSVAR_RENT_PUBKEY,
                    }
                ).instruction()

                let depositTx = context.program.rpc.deposit(
                    new anchor.BN(amount * (10 ** USDC_DECIMALS)),
                    {
                        accounts: {
                            optifiExchange: exchangeAddress,
                            userAccount: userAccountAddress,
                            userMarginAccountUsdc: userAccount.userMarginAccountUsdc,
                            depositSource: userOptifiUsdcAccount,
                            user: context.provider.wallet.publicKey,
                            tokenProgram: TOKEN_PROGRAM_ID
                        },
                        preInstructions: [wrapUSDCInx]
                    },
                )
                depositTx.then(res => {
                    resolve({
                        successful: true,
                        data: res as TransactionSignature
                    })
                })
            } else {
                console.error("User account did not exist at ", userAccountAddress);
                reject(userAccountAddress);
            }
        } catch (err) {
            reject(err)
        }
    })
}