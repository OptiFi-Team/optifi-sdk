import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {PublicKey, TransactionSignature} from "@solana/web3.js";
import {findExchangeAccount, findUserAccount, getDexOpenOrders} from "../utils/accounts";
import {OptifiMarket, UserAccount} from "../types/optifi-exchange-types";
import {deriveVaultNonce, getSerumMarket} from "../utils/market";
import {SERUM_DEX_PROGRAM_ID} from "../constants";
import {findSerumPruneAuthorityPDA} from "../utils/pda";
import {signAndSendTransaction} from "../utils/transactions";


export default function recordPnl(context: Context,
                                  userToSettle: PublicKey,
                                  market: PublicKey,
                                  instrument: PublicKey): Promise<InstructionResult<string>> {
    return new Promise((resolve, reject) => {
        findUserAccount(context).then(([userAccountAddress, _]) => {
            context.program.account.userAccount.fetch(userAccountAddress).then((userAcctRaw) => {
                // @ts-ignore
                let userAccount = userAcctRaw as UserAccount;
                findExchangeAccount(context).then(([exchangeAddress, _]) => {
                    context.program.account.optifiMarket.fetch(market).then((res) => {
                        let optifiMarket = res as OptifiMarket;
                        let serumMarketAddress = optifiMarket.serumMarket;
                        findSerumPruneAuthorityPDA(context).then(([pruneAuthorityAddress, _]) => {
                            deriveVaultNonce(serumMarketAddress, new PublicKey(SERUM_DEX_PROGRAM_ID))
                                .then(([vaultAddress, nonce]) => {
                                    getSerumMarket(context, serumMarketAddress).then((serumMarket) => {
                                        getDexOpenOrders(context, serumMarketAddress, userToSettle).then(([openOrdersAccount, _]) => {
                                            let settlementTx = context.program.transaction.recordPnlForOneUser({
                                                optifiExchange: exchangeAddress,
                                                userAccount: userToSettle,
                                                optifiMarket: market,
                                                serumMarket: serumMarketAddress,
                                                userSerumOpenOrders: openOrdersAccount,
                                                instrument: instrument,
                                                bids: serumMarket.bidsAddress,
                                                asks: serumMarket.asksAddress,
                                                eventQueue: serumMarket.decoded.eventQueue,
                                                coinVault: serumMarket.decoded.baseVault,
                                                pcVault: serumMarket.decoded.quoteVault,
                                                vaultSigner: vaultAddress,
                                                userMarginAccount: userAccount.userMarginAccountUsdc,
                                                instrumentLongSplTokenMint: optifiMarket.instrumentLongSplToken,
                                                instrumentShortSplTokenMint: optifiMarket.instrumentShortSplToken,
                                                userInstrumentLongTokenVault: userAccount,
                                                userInstrumentShortTokenVault: userAccount,
                                                pruneAuthority: pruneAuthorityAddress
                                            })
                                            signAndSendTransaction(context, settlementTx).then((settlementRes) => {
                                                resolve({
                                                    successful: true,
                                                    data: settlementRes.txId as TransactionSignature
                                                })
                                            }).catch((err) => err)
                                        })
                                    })
                                })
                        })
                    }).catch((err) => {
                        console.error(err);
                        reject(err);
                    })
                })

            })
        })
    })
}