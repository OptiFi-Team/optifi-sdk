import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {PublicKey, SYSVAR_CLOCK_PUBKEY, TransactionSignature} from "@solana/web3.js";
import {findExchangeAccount, findOracleSpotAccount, findUserAccount, getDexOpenOrders} from "../utils/accounts";
import {Asset, Chain, OptifiMarket, UserAccount} from "../types/optifi-exchange-types";
import {deriveVaultNonce, findMarketInstrumentContext, getSerumMarket} from "../utils/market";
import {SERUM_DEX_PROGRAM_ID, SWITCHBOARD} from "../constants";
import {findSerumPruneAuthorityPDA} from "../utils/pda";
import {signAndSendTransaction} from "../utils/transactions";
import {TOKEN_PROGRAM_ID} from "@solana/spl-token";


export default function recordPnl(context: Context,
                                  userToSettle: PublicKey,
                                  market: PublicKey,
                                  instrument: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findUserAccount(context).then(([userAccountAddress, _]) => {
            context.program.account.userAccount.fetch(userAccountAddress).then((userAcctRaw) => {
                // @ts-ignore
                let userAccount = userAcctRaw as UserAccount;
                findExchangeAccount(context).then(([exchangeAddress, _]) => {
                    findMarketInstrumentContext(context, market).then((marketContext) => {
                        findSerumPruneAuthorityPDA(context).then(([pruneAuthorityAddress, _]) => {
                            findOracleSpotAccount(context, marketContext.optifiMarket.instrument).then((oracleSpotAccount) =>
                                deriveVaultNonce(marketContext.optifiMarket.serumMarket, new PublicKey(SERUM_DEX_PROGRAM_ID))
                                    .then(([vaultAddress, nonce]) => {
                                        getSerumMarket(context, marketContext.optifiMarket.serumMarket).then((serumMarket) => {
                                            getDexOpenOrders(context, marketContext.optifiMarket.serumMarket, userToSettle).then(([openOrdersAccount, _]) => {
                                                let settlementTx = context.program.transaction.recordPnlForOneUser({
                                                    accounts: {
                                                        optifiExchange: exchangeAddress,
                                                        userAccount: userToSettle,
                                                        optifiMarket: market,
                                                        serumMarket: marketContext.optifiMarket.serumMarket,
                                                        userSerumOpenOrders: openOrdersAccount,
                                                        instrument: instrument,
                                                        bids: serumMarket.bidsAddress,
                                                        asks: serumMarket.asksAddress,
                                                        eventQueue: serumMarket.decoded.eventQueue,
                                                        coinVault: serumMarket.decoded.baseVault,
                                                        pcVault: serumMarket.decoded.quoteVault,
                                                        vaultSigner: vaultAddress,
                                                        userMarginAccount: userAccount.userMarginAccountUsdc,
                                                        instrumentLongSplTokenMint: marketContext.optifiMarket.instrumentLongSplToken,
                                                        instrumentShortSplTokenMint: marketContext.optifiMarket.instrumentShortSplToken,
                                                        userInstrumentLongTokenVault: marketContext.longSPLTokenVault,
                                                        userInstrumentShortTokenVault: marketContext.shortSPLTokenVault,
                                                        pruneAuthority: pruneAuthorityAddress,
                                                        serumDexProgramId: new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint]),
                                                        tokenProgram: TOKEN_PROGRAM_ID,
                                                        clock: SYSVAR_CLOCK_PUBKEY,
                                                        assetSpotPriceOracleFeed: oracleSpotAccount,
                                                        usdcSpotPriceOracleFeed: new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_USDC_USDC)
                                                    }
                                                })
                                                signAndSendTransaction(context, settlementTx).then((settlementRes) => {
                                                    resolve({
                                                        successful: true,
                                                        data: settlementRes.txId as TransactionSignature
                                                    })
                                                }).catch((err) => err)
                                            })
                                        }).catch((err) => reject(err))
                                })).catch((err) => reject(err))
                            }).catch((err) => reject(err))
                        }).catch((err) => reject(err))
                    }).catch((err) => reject(err))
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        })
}

