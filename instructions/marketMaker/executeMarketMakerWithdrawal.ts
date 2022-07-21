import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findMarketMakerAccount, findUserAccount } from "../../utils/accounts";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { findAssociatedTokenAccount } from "../../utils/token";
import { USDC_TOKEN_MINT } from "../../constants";

export default function executeMarketMakerWithdrawal(context: Context): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findUserAccount(context).then(([userAccountAddress, _]) => {
                context.program.account.userAccount.fetch(userAccountAddress).then((userAcctRaw) => {
                    findMarketMakerAccount(context).then(([marketMakerAccount]) => {
                        findAssociatedTokenAccount(context, new PublicKey(USDC_TOKEN_MINT[context.cluster])).then(([userQuoteTokenVault, _]) => {

                            let marketMakerWithdrawTx = context.program.rpc.executeMarketMakerWithdrawal({
                                accounts: {
                                    optifiExchange: exchangeAddress,
                                    userAccount: userAccountAddress,
                                    userMarginAccountUsdc: userAcctRaw.userMarginAccountUsdc,
                                    withdrawDest: userQuoteTokenVault,
                                    marketMakerAccount: marketMakerAccount,
                                    user: context.provider.wallet.publicKey,
                                    tokenProgram: TOKEN_PROGRAM_ID
                                }
                            });
                            marketMakerWithdrawTx.then((res) => {
                                console.log("Successfully execute market maker withdraw",
                                    formatExplorerAddress(context, res as string,
                                        SolanaEntityType.Transaction));
                                resolve({
                                    successful: true,
                                    data: res as TransactionSignature
                                })
                            }).catch((err) => {
                                console.error(err);
                                reject(err);
                            })
                        }).catch((err) => reject(err))
                    }).catch((err) => reject(err))
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}