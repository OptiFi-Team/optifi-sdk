import Context from "../types/context";
import {PublicKey, TransactionSignature} from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";
import {findExchangeAccount, findOracleAccountFromInstrument, findUserAccount} from "../utils/accounts";
import {deriveVaultNonce, findMarketInstrumentContext, getSerumMarket} from "../utils/market";
import {findOptifiUSDCPoolAuthPDA, findSerumPruneAuthorityPDA} from "../utils/pda";
import {SERUM_DEX_PROGRAM_ID, USDC_TOKEN_MINT} from "../constants";
import {Exchange, UserAccount} from "../types/optifi-exchange-types";
import {TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";

export default function settleFunds(context: Context,
                                    marketAddress: PublicKey,
                                    instrumentAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findUserAccount(context).then(([userAccountAddress, _]) => {
                context.program.account.userAccount.fetch(userAccountAddress).then((userAccountRes) => {
                    // @ts-ignore
                    let userAccount = userAccountRes as UserAccount;
                    findOptifiUSDCPoolAuthPDA(context).then(([centralUSDCPoolAuth, _]) => {
                        context.program.account.exchange.fetch(exchangeAddress).then((exchangeRes) => {
                            let exchange = exchangeRes as Exchange;
                            let settleTx = context.program.transaction.settleFundForOneUser({
                                accounts: {
                                    optifiExchange: exchangeAddress,
                                    userAccount: userAccountAddress,
                                    userMarginAccountUsdc: userAccount.userMarginAccountUsdc,
                                    centralUsdcPool: exchange.usdcCentralPool,
                                    centralUsdcPoolAuth: centralUSDCPoolAuth,
                                    usdcMint: new PublicKey(USDC_TOKEN_MINT[context.endpoint]),
                                    tokenProgram: TOKEN_PROGRAM_ID
                                }
                            });
                            signAndSendTransaction(context, settleTx).then((settleRes) => {
                                if (settleRes.resultType === TransactionResultType.Successful) {
                                    resolve({
                                        successful: true,
                                        data: settleRes.txId as TransactionSignature
                                    })
                                } else {
                                    console.error(settleRes);
                                    reject(settleRes);
                                }
                            }).catch((err) => reject(err))
                        }).catch((err) => reject(err))
                    }).catch((err) => reject(err))
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}
