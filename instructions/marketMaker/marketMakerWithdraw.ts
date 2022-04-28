import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findMarketMakerAccount, findUserAccount } from "../../utils/accounts";
import { findAssociatedTokenAccount } from "../../utils/token";
import { USDC_TOKEN_MINT } from "../../constants";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";

export default function MarketMakerWithdraw(context: Context): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findUserAccount(context).then(([userAccountAddress, _]) => {
                context.program.account.userAccount.fetch(userAccountAddress).then((userAcctRaw) => {
                    findMarketMakerAccount(context).then(([marketMakerAccount]) => {
                        findAssociatedTokenAccount(context,
                            new PublicKey(USDC_TOKEN_MINT[context.endpoint]),
                            userAccountAddress).then((userAccountAddress) => {
                                let marketMakerWithdrawTx = context.program.rpc.scheduleMarketMakerWithdrawal({
                                    accounts: {
                                        optifiExchange: exchangeAddress,
                                        userAccount: userAccountAddress,
                                        userMarginAccountUsdc: userAcctRaw.userMarginAccountUsdc,
                                        marketMakerAccount: marketMakerAccount,
                                        user: context.provider.wallet.publicKey,
                                        clock: SYSVAR_CLOCK_PUBKEY

                                    }
                                });
                                marketMakerWithdrawTx.then((res) => {
                                    console.log("Successfully scheduled market maker withdraw",
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