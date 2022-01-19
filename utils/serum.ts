import Context from "../types/context";
import {PublicKey, TransactionSignature} from "@solana/web3.js";
import {Market, OpenOrders} from "@project-serum/serum";
import {SERUM_DEX_PROGRAM_ID} from "../constants";
import {DexInstructions} from '@project-serum/serum';
import {formOrderContext} from "./orders";
import {OptifiMarket, OrderSide, UserAccount} from "../types/optifi-exchange-types";
import {findOrCreateAssociatedTokenAccount} from "./token";
import {findUserAccount} from "./accounts";
import {signAndSendTransaction, TransactionResultType} from "./transactions";

export function getSerumMarket(context: Context, marketAddress: PublicKey): Promise<Market> {
    return Market.load(context.connection, marketAddress, {}, new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint]))
}

export function getSerumMarketPrice(context: Context, serumMarketAddress: PublicKey): Promise<number> {
    return new Promise((resolve, reject) => {
        getSerumMarket(context, serumMarketAddress).then((market) => {
            market.loadBids(context.connection).then((bids) => {
                market.loadAsks(context.connection).then((asks) => {
                    let bidOrders: number[] = [];
                    let askOrders: number[] = [];
                    for (let item of bids.items()) {
                        bidOrders.push(item.price);
                    }
                    for (let item of asks.items()) {
                        askOrders.push(item.price)
                    }
                    let maxBid = Math.max(...bidOrders);
                    let minAsk = Math.min(...askOrders);
                    if (maxBid === Infinity || minAsk === Infinity || maxBid === -Infinity || minAsk === -Infinity) {
                        resolve(0);
                    } else {
                        let diff = Math.abs(minAsk - maxBid) / 2;
                        resolve(minAsk + diff);
                    }
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}

export function settleSerumFunds(context: Context,
                                 marketAddress: PublicKey,
                                 openOrdersAccount: OpenOrders): Promise<TransactionSignature> {
    return new Promise((resolve, reject) => {
        context.program.account.optifiMarket.fetch(marketAddress).then((marketRes) => {
            let optifiMarket = marketRes as OptifiMarket;
            getSerumMarket(context, optifiMarket.serumMarket).then((serumMarket) => {
               findUserAccount(context).then(([userAccountAddress, _]) => {
                   context.program.account.userAccount.fetch(userAccountAddress).then((userAccountRes) => {
                       // @ts-ignore
                       let userAccount = userAccountRes as UserAccount;
                       findOrCreateAssociatedTokenAccount(context, optifiMarket.instrumentLongSplToken, userAccountAddress).then((longTokenAccount) => {
                               serumMarket.makeSettleFundsTransaction(
                                   context.connection,
                                   openOrdersAccount,
                                   longTokenAccount,
                                   userAccount.userMarginAccountUsdc
                               ).then((settleTx) => {
                                   signAndSendTransaction(context, settleTx.transaction).then((settleRes) => {
                                       if (settleRes.resultType === TransactionResultType.Successful) {
                                           resolve(settleRes.txId as TransactionSignature);
                                       } else {
                                           console.error(settleRes);
                                           reject(settleRes);
                                       }
                                   }).catch((err) => {
                                       console.error(err);
                                       reject(err);
                                   })
                               }).catch((err) => {
                                   console.error(err);
                                   reject(err);
                               });
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

export function settleSerumFundsIfAnyUnsettled(context: Context,
                                               marketAddress: PublicKey): Promise<TransactionSignature[]> {
    return new Promise((resolve, reject) => {
        let txSigs: TransactionSignature[] = [];
        context.program.account.optifiMarket.fetch(marketAddress).then((marketRes) => {
            let optifiMarket = marketRes as OptifiMarket;
            getSerumMarket(context, optifiMarket.serumMarket).then((serumMarket) => {
                findUserAccount(context).then(([userAccountAddress, _]) => {
                    serumMarket.findOpenOrdersAccountsForOwner(context.connection, userAccountAddress)
                        .then((openOrdersAccounts) => {
                            const doOpenOrdersSettle = async () => {
                                for (let openOrders of openOrdersAccounts) {
                                    if (openOrders.baseTokenFree.toNumber() > 0 || openOrders.quoteTokenFree.toNumber() > 0) {
                                        console.log("Settling open orders, ", openOrders);
                                        try {
                                            let txSig = await settleSerumFunds(context, marketAddress, openOrders);
                                            txSigs.push(txSig)
                                        }
                                        catch (e) {
                                            console.error(e);
                                            reject(e);
                                        }
                                    }
                                }
                            }
                            doOpenOrdersSettle().then(() => {
                                resolve(txSigs)
                            }).catch((err) => reject(err))
                        })
                })
            })
        })

    })
}

/**
 * To be called after an order - watch for open orders changes, and then once it's changed, do settlement
 */
export function watchSettleSerumFunds(context: Context,
                                      marketAddress: PublicKey): Promise<TransactionSignature[]> {
    return new Promise((resolve, reject) => {
        const waitSerumSettle = async () => {
            try {
                let txSigs = await settleSerumFundsIfAnyUnsettled(context, marketAddress);
                if (txSigs.length === 0) {
                    console.log("Waiting 1 second for serum settlement");
                    setTimeout(waitSerumSettle, 1000);
                } else {
                    console.log("Settled serum funds!");
                    resolve(txSigs)
                }
            } catch (e) {
                console.error(e);
                reject(e);
            }
        }
        waitSerumSettle();
    })
}