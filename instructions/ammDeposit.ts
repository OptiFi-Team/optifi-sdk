import * as anchor from "@project-serum/anchor";
import Context from "../types/context";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findUserAccount } from "../utils/accounts";
import { AmmAccount } from "../types/optifi-exchange-types";
import { getAmmLiquidityAuthPDA } from "../utils/pda";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { signAndSendTransaction, TransactionResultType } from "../utils/transactions";
import InstructionResult from "../types/instructionResult";
import { findAssociatedTokenAccount } from "../utils/token";
import { USDC_TOKEN_MINT } from "../lib/constants";

export default function ammDeposit(context: Context,
    ammAddress: PublicKey,
    amount: number): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findUserAccount(context).then(([userAccountAddress, _]) => {
                context.program.account.ammAccount.fetch(ammAddress).then((ammRes) => {
                    // @ts-ignore
                    let amm = ammRes as AmmAccount;
                    findAssociatedTokenAccount(context, new PublicKey(USDC_TOKEN_MINT[context.endpoint])).then(([userQuoteTokenVault, _]) => {
                        findAssociatedTokenAccount(context, amm.lpTokenMint).then(([userLpTokenVault, _]) => {
                            getAmmLiquidityAuthPDA(context).then(([liquidityAuthPDA, _]) => {
                                context.connection.getTokenAccountBalance(userQuoteTokenVault).then(tokenAmount => {
                                    context.program.rpc.ammDeposit(
                                        new anchor.BN(amount * (10 ** tokenAmount.value.decimals)),
                                        {
                                            accounts: {
                                                optifiExchange: exchangeAddress,
                                                amm: ammAddress,
                                                userAccount: userAccountAddress,
                                                ammQuoteTokenVault: amm.quoteTokenVault,
                                                userQuoteTokenVault: userQuoteTokenVault,
                                                lpTokenMint: amm.lpTokenMint,
                                                ammLiquidityAuth: liquidityAuthPDA,
                                                userLpTokenVault: userLpTokenVault,
                                                user: context.provider.wallet.publicKey,
                                                tokenProgram: TOKEN_PROGRAM_ID
                                            }
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