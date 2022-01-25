import * as anchor from "@project-serum/anchor";
import Context from "../types/context";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findUserAccount, findUserUSDCAddress, userAccountExists } from "../utils/accounts";
import { USDC_TOKEN_MINT } from "../constants";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { signAndSendTransaction, TransactionResultType } from "../utils/transactions";
import InstructionResult from "../types/instructionResult";


export default function withdraw(context: Context,
    amount: number): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findUserAccount(context).then(([userAccountAddress, _]) => {
                userAccountExists(context).then(([acctExists, acct]) => {
                    if (acctExists && acct !== undefined) {
                        findUserUSDCAddress(context).then(([userUSDCAddress, _]) => {
                            context.connection.getTokenAccountBalance(acct.userMarginAccountUsdc).then(tokenAmount => {
                                console.log("userMarginAccountUsdc: ", acct.userMarginAccountUsdc.toString());
                                console.log("balance: ", tokenAmount.value.uiAmount);
                                let withdrawTx = context.program.transaction.withdraw(
                                    new anchor.BN(amount * (10 ** tokenAmount.value.decimals)),
                                    {
                                        accounts: {
                                            optifiExchange: exchangeAddress,
                                            userAccount: userAccountAddress,
                                            depositTokenMint: new PublicKey(USDC_TOKEN_MINT[context.endpoint]),
                                            userMarginAccountUsdc: acct.userMarginAccountUsdc,
                                            withdrawDest: userUSDCAddress,
                                            user: context.provider.wallet.publicKey,
                                            tokenProgram: TOKEN_PROGRAM_ID
                                        }
                                    }
                                );
                                signAndSendTransaction(context, withdrawTx).then((txRes) => {
                                    if (txRes.resultType === TransactionResultType.Successful) {
                                        resolve({
                                            successful: true,
                                            data: txRes.txId as TransactionSignature
                                        })
                                    } else {
                                        console.error(txRes);
                                        reject(txRes);
                                    }
                                }).catch((err) => reject(err));
                            }).catch((err) => reject(err));
                        }).catch((err) => reject(err));
                    } else {
                        console.error("Account didn't exist ", userAccountAddress);
                        reject(userAccountAddress);
                    }
                }).catch((err) => reject(err));
            }).catch((err) => reject(err));
        }).catch((err) => reject(err));
    })
}
