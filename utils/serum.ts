import Context from "../types/context";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { Market, OpenOrders } from "@project-serum/serum";
import { SERUM_DEX_PROGRAM_ID } from "../constants";
import { OptifiMarket } from "../types/optifi-exchange-types";
import { findUserAccount, getFilteredProgramAccounts } from "./accounts";
import settleOrderFunds from "../instructions/order/settleOrderFunds";

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

export function settleSerumFundsIfAnyUnsettled(context: Context,
    marketAddress: PublicKey): Promise<TransactionSignature | null> {
    return new Promise((resolve, reject) => {
        context.program.account.optifiMarket.fetch(marketAddress).then((marketRes) => {
            let optifiMarket = marketRes as OptifiMarket;
            getSerumMarket(context, optifiMarket.serumMarket).then((serumMarket) => {
                findUserAccount(context).then(([userAccountAddress, _]) => {
                    serumMarket.findOpenOrdersAccountsForOwner(context.connection, userAccountAddress)
                        .then((openOrdersAccounts) => {
                            const doOpenOrdersSettle = async () => {
                                console.debug("In open orders settle for market ", marketAddress.toString(), openOrdersAccounts.length, "open orders accounts");
                                for (let openOrders of openOrdersAccounts) {
                                    console.log("openOrders.baseTokenFree.toNumber() ", openOrders.baseTokenFree.toNumber());
                                    console.log("openOrders.quoteTokenFree.toNumber() ", openOrders.quoteTokenFree.toNumber());
                                    if (openOrders.baseTokenFree.toNumber() > 0 || openOrders.quoteTokenFree.toNumber() > 0) {
                                        // console.log("openOrders ", openOrders);
                                        let [userAccountAddress, _] = await findUserAccount(context);
                                        let res = await context.program.account.userAccount.fetch(userAccountAddress);
                                        // @ts-ignore
                                        let userAccount = res as UserAccount;
                                        settleOrderFunds(context, [marketAddress], userAccount).then((res) => {
                                            console.debug(res);
                                            // If any of them were successful, we only need to settle once.
                                            resolve(res.data as TransactionSignature);
                                        }).catch((err) => {
                                            console.error(err);
                                            reject(err);
                                        })
                                    }
                                }
                            }
                            doOpenOrdersSettle();
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
    marketAddress: PublicKey): Promise<void> {
    return new Promise((resolve, reject) => {
        const waitSerumSettle = async () => {
            try {
                let res = await settleSerumFundsIfAnyUnsettled(context, marketAddress);
                if (res) {
                    console.log("Settled serum funds!");
                    resolve();
                } else {
                    console.log("Waiting 1 second for serum settlement");
                    setTimeout(waitSerumSettle, 1000);
                }
            } catch (e) {
                console.error(e);
                reject(e);
            }
        }
        waitSerumSettle();
    })
}

export async function findOpenOrdersForSerumMarket(context: Context, marketAddress: PublicKey, programId: PublicKey = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint])) {
    const filters = [
        {
            memcmp: {
                offset: 13,
                bytes: marketAddress.toBase58(),
            },
        },
        {
            dataSize: 3228,
        },
    ];
    const accounts = await getFilteredProgramAccounts(context, programId, filters);
    return accounts.map(({ publicKey, accountInfo }) => OpenOrders.fromAccountInfo(publicKey, accountInfo, programId));
}