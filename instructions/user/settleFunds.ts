import Context from "../../types/context";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../../types/instructionResult";
import { findExchangeAccount } from "../../utils/accounts";
import { findOptifiUSDCPoolAuthPDA } from "../../utils/pda";
import { OPUSDC_TOKEN_MINT } from "../../constants";
import { Exchange, UserAccount } from "../../types/optifi-exchange-types";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { signAndSendTransaction, TransactionResultType } from "../../utils/transactions";

export default function settleFunds(context: Context,
    userToSettle: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.userAccount.fetch(userToSettle).then((userAccountRes) => {
                // @ts-ignore
                let userAccount = userAccountRes as UserAccount;
                findOptifiUSDCPoolAuthPDA(context).then(([centralUSDCPoolAuth, _]) => {
                    context.program.account.exchange.fetch(exchangeAddress).then((exchangeRes) => {
                        let exchange = exchangeRes as Exchange;
                        context.program.rpc.settleFundForOneUser({
                            accounts: {
                                optifiExchange: exchangeAddress,
                                userAccount: userToSettle,
                                userMarginAccountUsdc: userAccount.userMarginAccountUsdc,
                                centralUsdcPool: exchange.usdcCentralPool,
                                centralUsdcPoolAuth: centralUSDCPoolAuth,
                                usdcMint: new PublicKey(OPUSDC_TOKEN_MINT[context.cluster]),
                                tokenProgram: TOKEN_PROGRAM_ID
                            }
                        }).then((res) => {
                            resolve({
                                successful: true,
                                data: res as TransactionSignature
                            })
                        }).catch((err) => reject(err))
                    }).catch((err) => reject(err))
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}
