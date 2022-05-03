import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { SYSVAR_CLOCK_PUBKEY, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findMarketMakerAccount, findUserAccount } from "../../utils/accounts";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";
import { USDC_DECIMALS } from "../../constants";
import * as anchor from "@project-serum/anchor";

export default function scheduleMarketMakerWithdrawal(context: Context, amount: number): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findUserAccount(context).then(([userAccountAddress, _]) => {
                context.program.account.userAccount.fetch(userAccountAddress).then((userAcctRaw) => {
                    findMarketMakerAccount(context).then(([marketMakerAccount]) => {
                        let marketMakerWithdrawTx = context.program.rpc.scheduleMarketMakerWithdrawal(
                            new anchor.BN(amount * 10 ** USDC_DECIMALS),
                            {
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
    })
}