import * as anchor from "@project-serum/anchor";
import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findUserAccount } from "../utils/accounts";
import { AmmAccount } from "../types/optifi-exchange-types";
import { getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { signAndSendTransaction, TransactionResultType } from "../utils/transactions";
import { findAssociatedTokenAccount } from "../utils/token";
import { getAmmLiquidityAuthPDA } from "../utils/pda";
import { USDC_TOKEN_MINT } from "../constants";

export default function ammWithdraw(context: Context,
    ammAddress: PublicKey,
    amount: number): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            getAmmLiquidityAuthPDA(context).then(([liquidityAuthPDA, _]) => {
                context.program.account.ammAccount.fetch(ammAddress).then((ammRes) => {
                    // @ts-ignore
                    let amm = ammRes as Amm;
                    findAssociatedTokenAccount(context, new PublicKey(USDC_TOKEN_MINT[context.endpoint])).then(([userQuoteTokenVault, _]) => {
                        findAssociatedTokenAccount(context, amm.lpTokenMint).then(([userLpTokenVault, _]) => {

                            getMint(context.connection, amm.lpTokenMint).then(tokenMintInfo => {
                                context.program.rpc.ammWithdraw(
                                    new anchor.BN(amount * (10 ** tokenMintInfo.decimals)),
                                    {
                                        accounts: {
                                            optifiExchange: exchangeAddress,
                                            amm: ammAddress,
                                            ammQuoteTokenVault: amm.quoteTokenVault,
                                            userQuoteTokenVault: userQuoteTokenVault,
                                            lpTokenMint: amm.lpTokenMint,
                                            userLpTokenVault: userLpTokenVault,
                                            user: context.provider.wallet.publicKey,
                                            tokenProgram: TOKEN_PROGRAM_ID,
                                            ammLiquidityAuth: liquidityAuthPDA
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
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}