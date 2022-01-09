import Context from "../types/context";
import {PublicKey, TransactionSignature} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { Market } from "@project-serum/serum";
import {Chain, Exchange, OptifiMarket} from "../types/optifi-exchange-types";
import {findAccountWithSeeds, findExchangeAccount, findUserAccount} from "./accounts";
import {OPTIFI_MARKET_PREFIX, SERUM_DEX_PROGRAM_ID} from "../constants";
import {findAssociatedTokenAccount} from "./token";
import ExchangeMarket from "../types/exchangeMarket";


export function findOptifiMarketWithIdx(context: Context,
                                         exchangeAddress: PublicKey,
                                         idx: number): Promise<[PublicKey, number]> {
    return findAccountWithSeeds(context, [
        Buffer.from(OPTIFI_MARKET_PREFIX),
        exchangeAddress.toBuffer(),
        new anchor.BN(idx).toArrayLike(Buffer, "be", 8)
    ])
}


export function findOptifiMarkets(context: Context): Promise<[OptifiMarket, PublicKey][]> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.exchange.fetch(exchangeAddress).then((exchangeRes) => {
                let exchange = exchangeRes as Exchange;
                let markets = exchange.markets as ExchangeMarket[];
                let marketsWithKeys: [OptifiMarket, PublicKey][] = [];
                const retrieveMarket = async () => {
                    for (let market of markets) {
                        let marketRes = await context.program.account.optifiMarket.fetch(market.optifiMarketPubkey);
                        let optifiMarket = marketRes as OptifiMarket;
                        marketsWithKeys.push([optifiMarket, market.optifiMarketPubkey])
                    }
                }
                retrieveMarket().then(() => {
                    resolve(marketsWithKeys)
                }).catch((err) => {
                    console.error(err);
                    reject(err);
                })
            })
        })
    })
}

export function findOptifiInstruments(context: Context): Promise<Chain[]> {
    return new Promise((resolve, reject) => {
        findOptifiMarkets(context).then((marketRes) => {
            let markets = marketRes.map((i) => i[0]);
            let instruments: Chain[] = []
            Promise.all([
                markets.map((m) =>
                    context.program.account.chain.fetch(m.instrument).then((res) => {
                        // @ts-ignore
                        instruments.push(res as Chain)
                    })
                )
            ])
                .then(() => resolve(instruments))
                .catch((err) => reject(err))
        })
    })
}

export function findExpiredMarkets(context: Context): Promise<[OptifiMarket, PublicKey][]> {
    return new Promise((resolve, reject) => {
        findOptifiMarkets(context).then((markets) => {
            let expiredMarkets: [OptifiMarket, PublicKey][] = [];
            let now = new anchor.BN(Date.now());
            Promise.all(markets.map((m) => new Promise((chainRes) => {
                context.program.account.chain.fetch(m[0].instrument).then((res) => {
                    // @ts-ignore
                    let chain = res as Chain;
                    if (chain.expiryDate >= now) {
                        expiredMarkets.push(m);
                    }
                    chainRes(chain);
                }).catch((err) => reject(err));
            }))).then(() => resolve(
                expiredMarkets
            )).catch((err) => reject(err));
        })
    })
}

export function getSerumMarket(context: Context, marketAddress: PublicKey): Promise<Market> {
    return Market.load(context.connection, marketAddress, {}, new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint]))
}

export function deriveVaultNonce(marketKey: PublicKey,
                          dexProgramId: PublicKey,
                          nonceS: number = 0): Promise<[anchor.web3.PublicKey, anchor.BN]> {
    return new Promise((resolve, reject) => {
        const nonce = new anchor.BN(nonceS);
        if (nonceS > 255) {
            reject(new Error("Unable to find nonce"));
        }
        const tryNext = () => {
            deriveVaultNonce(
                marketKey,
                dexProgramId,
                nonceS+1
            )
                .then((res) => resolve(res))
                .catch((err) => reject(err))
        }
        try {
            PublicKey.createProgramAddress([marketKey.toBuffer(), nonce.toArrayLike(Buffer, "le", 8)],
                dexProgramId).then((vaultOwner) => {
                console.log("Returning vault ", vaultOwner, nonce);
                resolve([vaultOwner, nonce])
            }).catch((err) => {
                tryNext();
            })
        } catch (e) {
            tryNext();
        }
    })
}

export interface InstrumentAccounts {
    longSPLTokenVault: PublicKey,
    shortSPLTokenVault: PublicKey,
    optifiMarket: OptifiMarket,
}

export function findMarketInstrumentContext(context: Context, marketAddress: PublicKey): Promise<InstrumentAccounts> {
    return new Promise((resolve, reject) => {
        context.program.account.optifiMarket.fetch(marketAddress).then((marketRes) => {
            let optifiMarket = marketRes as OptifiMarket;
            findUserAccount(context).then(([userAccountAddress, _]) => {
                findAssociatedTokenAccount(context, optifiMarket.instrumentLongSplToken, userAccountAddress).then(([longSPLTokenVault, _]) => {
                    findAssociatedTokenAccount(context, optifiMarket.instrumentShortSplToken, userAccountAddress).then(([shortSPLTokenVault, _]) => {
                        resolve({
                            longSPLTokenVault: longSPLTokenVault,
                            shortSPLTokenVault: shortSPLTokenVault,
                            optifiMarket: optifiMarket
                        })
                    }).catch((err) => reject(err))
                }).catch((err) => reject(err))
            })
        }).catch((err) => reject(err))
    })
}