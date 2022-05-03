import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findMarketMakerAccount, findUserAccount } from "../../utils/accounts";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { findOptifiUSDCPoolAuthPDA } from "../../utils/pda";

export default function mmSettlePenaltyReward(context: Context, userAccountToSettle: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            let userAccountAddress = userAccountToSettle;

            context.program.account.userAccount.fetch(userAccountAddress).then((userAcctRaw) => {
                findMarketMakerAccount(context).then(async ([marketMakerAccount]) => {

                    let exchangeRes = await context.program.account.exchange.fetch(exchangeAddress);
                    // @ts-ignore
                    let exchange = exchangeRes as Exchange;

                    let [centralUSDCPoolAuth,] = await findOptifiUSDCPoolAuthPDA(context);

                    let Tx = context.program.rpc.mmSettlePenaltyReward({
                        accounts: {
                            optifiExchange: exchangeAddress,
                            userAccount: userAccountAddress,
                            userMarginAccount: userAcctRaw.userMarginAccountUsdc,
                            marketMakerAccount: marketMakerAccount,
                            usdcFeePool: exchange.usdcFeePool,
                            centralUsdcPoolAuth: centralUSDCPoolAuth,
                            tokenProgram: TOKEN_PROGRAM_ID
                        }
                    });

                    Tx.then((res) => {
                        console.log("Successfully settle market maker reward and penalty",
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
    })
}