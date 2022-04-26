import Context from "../types/context";
import { Commitment, PublicKey } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { Market, Orderbook, OpenOrders } from "@project-serum/serum"
import { Chain, Exchange, OptifiMarket, UserAccount } from "../types/optifi-exchange-types";
import { findAccountWithSeeds, findExchangeAccount, findUserAccount } from "./accounts";
import { OPTIFI_MARKET_PREFIX, SERUM_DEX_PROGRAM_ID, USDC_DECIMALS } from "../constants";
import { numberAssetToDecimal } from "./generic";
import { findAssociatedTokenAccount, getTokenAccountFromAccountInfo, getTokenMintFromAccountInfo } from "./token";
import ExchangeMarket from "../types/exchangeMarket";
import initUserOnOptifiMarket from "../instructions/initUserOnOptifiMarket";
import { formatExplorerAddress, SolanaEntityType } from "./debug";
import UserPosition from "../types/user";
import {
    dateToAnchorTimestamp
} from "./generic";
const DECIMAL = 6;


export function findOptifiMarketWithIdx(context: Context,
    exchangeAddress: PublicKey,
    idx: number): Promise<[PublicKey, number]> {
    return findAccountWithSeeds(context, [
        Buffer.from(OPTIFI_MARKET_PREFIX),
        exchangeAddress.toBuffer(),
        new anchor.BN(idx).toArrayLike(Buffer, "be", 8)
    ])
}


export function findOptifiMarkets(context: Context, inputMarkets?: PublicKey[]): Promise<[OptifiMarket, PublicKey][]> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.exchange.fetch(exchangeAddress).then((exchangeRes) => {
                let exchange = exchangeRes as Exchange;
                let markets = exchange.markets as ExchangeMarket[];
                let marketsWithKeys: [OptifiMarket, PublicKey][] = [];
                const retrieveMarket = async () => {
                    // for (let market of markets) {
                    //     console.log("fetching optifi market")
                    //     let marketRes = await context.program.account.optifiMarket.fetch(market.optifiMarketPubkey);
                    //     let optifiMarket = marketRes as OptifiMarket;
                    //     marketsWithKeys.push([optifiMarket, market.optifiMarketPubkey])
                    // }

                    let marketAddresses = inputMarkets || markets.map(e => e.optifiMarketPubkey)
                    let marketsRawInfos = await context.program.account.optifiMarket.fetchMultiple(marketAddresses)
                    let marketsInfos = marketsRawInfos as OptifiMarket[];
                    marketAddresses.forEach((marketAddress, i) => {
                        marketsWithKeys.push([marketsInfos[i], marketAddress])
                    })
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

export function findStoppableOptifiMarkets(context: Context): Promise<[OptifiMarket, PublicKey][]> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.exchange.fetch(exchangeAddress).then((exchangeRes) => {
                let exchange = exchangeRes as Exchange;
                let markets = exchange.markets as ExchangeMarket[];
                let marketsWithKeys: [OptifiMarket, PublicKey][] = [];
                const retrieveMarket = async () => {
                    let marketAddresses = markets.map(e => e.optifiMarketPubkey)
                    let marketsRawInfos = await context.program.account.optifiMarket.fetchMultiple(marketAddresses)
                    let marketsInfos = marketsRawInfos as OptifiMarket[];
                    let longAndShortMints: PublicKey[] = []
                    marketsInfos.forEach(e => longAndShortMints.push(e.instrumentLongSplToken, e.instrumentShortSplToken))
                    let instrumentTokenMintsInfos = await context.connection.getMultipleAccountsInfo(longAndShortMints);

                    for (let i = 0; i < marketAddresses.length; i++) {
                        let longSupply = await getTokenMintFromAccountInfo(instrumentTokenMintsInfos[2 * i]!, longAndShortMints[i])
                        let shortSupply = await getTokenMintFromAccountInfo(instrumentTokenMintsInfos[2 * i + 1]!, longAndShortMints[2 * i + 1])
                        if (!marketsInfos[i].isStopped && longSupply.supply.toString() == "0" && shortSupply.supply.toString() == "0") {
                            marketsWithKeys.push([marketsInfos[i], marketAddresses[i]])
                        }
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

/**
 * get instrument info for all optifi markets
 * 
 *  *
 * @param context Context to use
 *
 * @return An list of array including instrument info, instrument pubkey and optifi market pubkey
 */
export function findOptifiInstruments(context: Context): Promise<[Chain, PublicKey, PublicKey][]> {
    return new Promise((resolve, reject) => {
        findOptifiMarkets(context).then(async (marketRes) => {
            let markets = marketRes.map((i) => i[0]) as OptifiMarket[];
            let instrumentAddresses = markets.map(e => e.instrument)

            // let instruments: Chain[] = []
            // Promise.all([
            //     markets.map((m) =>
            //         context.program.account.chain.fetch(m.instrument).then((res) => {
            //             // @ts-ignore   res is instruments detail info. (res.expiryDate)
            //             instruments.push(res as Chain)
            //         })
            //     )
            // ])
            //     .then(() => resolve(instruments))
            //     .catch((err) => reject(err))
            try {
                let instrumentRawInfos = await context.program.account.chain.fetchMultiple(instrumentAddresses)
                let instrumentInfos = instrumentRawInfos as Chain[]
                let res: [Chain, PublicKey, PublicKey][] = []
                instrumentInfos.forEach((e, i) => {
                    res.push([e as Chain, instrumentAddresses[i], marketRes[i][1]])
                })
                resolve(res)
            } catch (err) {
                reject(err)
            }
        }).catch((err) => reject(err))
    })
}



export interface OptifiMarketFullData {
    asset: "BTC" | "ETH",
    strike: number,
    instrumentType: "Call" | "Put",
    bidPrice: number,
    bidSize: number,
    bidOrderId: string,
    askPrice: number,
    askSize: number,
    askOrderId: string,
    volume: number,
    expiryDate: Date,// it is diff from "Date" in position
    marketAddress: PublicKey,
    marketId: number,
    instrumentAddress: PublicKey
    asks: Orderbook | null,
    bids: Orderbook | null,
    serumMarket: Market,
    asksPubkey: PublicKey,
    bidsPubkey: PublicKey,
}

/**
 * get optifi markets full data with less requests
 */
export function findOptifiMarketsWithFullData(context: Context): Promise<OptifiMarketFullData[]> {
    return new Promise((resolve, reject) => {
        // console.log("start to fetch findOptifiMarkets")
        findOptifiMarkets(context).then(async (marketRes) => {
            let markets = marketRes.map((e) => e[0]) as OptifiMarket[];
            let instrumentAddresses = markets.map(e => e.instrument)
            let serumMarketAddresses = markets.map(e => e.serumMarket)

            let res: OptifiMarketFullData[] = []
            try {
                // console.log("start to fetch instrumentInfos")
                let instrumentRawInfos = await context.program.account.chain.fetchMultiple(instrumentAddresses)
                let instrumentInfos = instrumentRawInfos as Chain[]

                // console.log("start to fetch serumMarketInfos")
                let serumMarketInfos = await context.connection.getMultipleAccountsInfo(serumMarketAddresses)
                let asksAndBidsAddresses: PublicKey[] = []
                let decodedSerumMarkets: Market[] = []
                let serumDexProgramId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint])
                serumMarketInfos.forEach((e, i) => {
                    let decoded = Market.getLayout(serumDexProgramId).decode(e?.data!)
                    if (!decoded.accountFlags.initialized ||
                        !decoded.accountFlags.market ||
                        !decoded.ownAddress.equals(serumMarketAddresses[i])) {
                        throw new Error('Invalid serum market');
                    }
                    // const [baseMintDecimals, quoteMintDecimals] = await Promise.all([
                    //     getMint(context.connection, decoded.baseMint),
                    //     getMint(context.connection, decoded.quoteMint),
                    // ]);

                    const [baseMintDecimals, quoteMintDecimals] = [numberAssetToDecimal(instrumentInfos[i].asset)!, USDC_DECIMALS]

                    let market = new Market(decoded, baseMintDecimals, quoteMintDecimals, undefined, serumDexProgramId, null);

                    // console.log("market: ", market)
                    decodedSerumMarkets.push(market)

                    // // @ts-ignore
                    // console.log("decoded.bidsAddress: ", decoded.bids)
                    // // @ts-ignore
                    // console.log("decoded.asksAddress: ", decoded.asks)
                    // @ts-ignore
                    asksAndBidsAddresses.push(market.asksAddress, market.bidsAddress)
                    res.push({
                        asset: instrumentInfos[i].asset == 0 ? "BTC" : "ETH",
                        strike: instrumentInfos[i].strike.toNumber(),
                        instrumentType: Object.keys(instrumentInfos[i].instrumentType)[0] === "call" ? "Call" : "Put",
                        bidPrice: 0,
                        bidSize: 0,
                        bidOrderId: "",
                        askPrice: 0,
                        askSize: 0,
                        askOrderId: "",
                        volume: 0,
                        expiryDate: new Date(instrumentInfos[i].expiryDate.toNumber() * 1000),
                        marketAddress: marketRes[i][1],
                        marketId: marketRes[i][0].optifiMarketId,
                        instrumentAddress: marketRes[i][0].instrument,
                        asks: null,
                        bids: null,
                        serumMarket: market,
                        asksPubkey: market.asksAddress,
                        bidsPubkey: market.bidsAddress
                    })
                })
                await getLatestAskNBidForMarkets(context, decodedSerumMarkets, asksAndBidsAddresses, res)
                resolve(res)
            } catch (err) {
                reject(err)
            }
        }).catch((err) => reject(err))
    })
}


function getLatestAskNBidForMarkets(context: Context, serumMarkets: Market[], asksAndBidsAddresses: PublicKey[], res: OptifiMarketFullData[]): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            // console.log("start to fetch asksAndBidsInfos")
            let asksAndBidsInfos = await context.connection.getMultipleAccountsInfo(asksAndBidsAddresses)
            asksAndBidsInfos.forEach((e, i) => {
                if (i % 2 == 0) {
                    let marketIdx = i / 2
                    let orderBook = Orderbook.decode(serumMarkets[marketIdx], e?.data!)
                    res[marketIdx].asks = orderBook
                    res[marketIdx].askPrice = orderBook.getL2(1).length > 0 ? orderBook.getL2(1)[0][0] : 0
                    res[marketIdx].askSize = orderBook.getL2(1).length > 0 ? orderBook.getL2(1)[0][1] : 0

                } else {
                    let marketIdx = (i - 1) / 2
                    let orderBook = Orderbook.decode(serumMarkets[marketIdx], e?.data!)
                    res[marketIdx].bids = orderBook
                    res[marketIdx].bidPrice = orderBook.getL2(1).length > 0 ? orderBook.getL2(1)[0][0] : 0
                    res[marketIdx].bidSize = orderBook.getL2(1).length > 0 ? orderBook.getL2(1)[0][1] : 0
                }
            })
            resolve()
        } catch (err) {
            reject(err)
        }
    })
}

// reload market data when you want to receive latest order book data for all markets
export function reloadOptifiMarketsData(context: Context, optifiMarkets: OptifiMarketFullData[]): Promise<OptifiMarketFullData[]> {
    return new Promise(async (resolve, reject) => {
        try {
            let asksAndBidsAddresses: PublicKey[] = []
            optifiMarkets.forEach(market => {
                asksAndBidsAddresses.push(market.asksPubkey, market.bidsPubkey)
            })
            let serumMarkets = optifiMarkets.map(e => e.serumMarket)
            let res = optifiMarkets;
            await getLatestAskNBidForMarkets(context, serumMarkets, asksAndBidsAddresses, res)
            resolve(res)
        } catch (err) {
            reject(err)
        }
    })
}


export function findExpiredMarkets(context: Context): Promise<[OptifiMarket, PublicKey][]> {
    return new Promise((resolve, reject) => {
        findOptifiMarkets(context).then((markets) => {
            let expiredMarkets: [OptifiMarket, PublicKey][] = [];
            let now = new anchor.BN(Math.floor(Date.now() / 1000));
            Promise.all(markets.map((m) => new Promise((chainRes) => {
                context.program.account.chain.fetch(m[0].instrument).then((res) => {
                    // @ts-ignore
                    let chain = res as Chain;
                    if (chain.expiryDate <= now) {
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

export function findValidMarkets(context: Context): Promise<[OptifiMarket, PublicKey][]> {
    return new Promise((resolve, reject) => {
        findOptifiMarkets(context).then((markets) => {
            let ValidMarkets: [OptifiMarket, PublicKey][] = [];
            let now = new anchor.BN(Date.now());
            Promise.all(markets.map((m) => new Promise((chainRes) => {
                context.program.account.chain.fetch(m[0].instrument).then((res) => {
                    // @ts-ignore
                    let chain = res as Chain;
                    if (chain.expiryDate > now) {
                        ValidMarkets.push(m);
                    }
                    chainRes(chain);
                }).catch((err) => reject(err));
            }))).then(() => resolve(
                ValidMarkets
            )).catch((err) => reject(err));
        })
    })
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
                nonceS + 1
            )
                .then((res) => resolve(res))
                .catch((err) => reject(err))
        }
        try {
            PublicKey.createProgramAddress([marketKey.toBuffer(), nonce.toArrayLike(Buffer, "le", 8)],
                dexProgramId).then((vaultOwner) => {
                    // console.log("Returning vault ", vaultOwner, nonce);
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

export function isUserInitializedOnMarket(context: Context, marketAddress: PublicKey, commitment?: Commitment): Promise<boolean> {
    return new Promise((resolve, reject) => {
        findMarketInstrumentContext(context, marketAddress).then((marketInstrumentContext) => {
            context.connection.getAccountInfo(marketInstrumentContext.longSPLTokenVault, commitment).then((acctInfo) => {
                if (acctInfo === null) {
                    resolve(false)
                } else {
                    resolve(true)
                }
            }).catch((err) => resolve(false));
        }).catch((err) => resolve(false));
    })
}

export function initializeUserIfNotInitializedOnMarket(context: Context,
    marketAddress: PublicKey): Promise<void> {
    return new Promise((resolve, reject) => {
        isUserInitializedOnMarket(context, marketAddress).then((userInitialized) => {
            if (userInitialized) {
                console.debug("User was already initialized on market");
                resolve()
            } else {
                console.debug("User was not initialized on market, initializing them...");
                initUserOnOptifiMarket(context, marketAddress).then((res) => {
                    if (res.successful) {
                        console.debug("Initialized user on market ", formatExplorerAddress(context,
                            res.data as string,
                            SolanaEntityType.Transaction)
                        );
                        resolve()
                    } else {
                        console.error(res);
                        reject(res)
                    }
                }).catch((err) => {
                    console.error(err);
                    reject(err);
                })
            }
        })
    })
}


/**
 * To get the user token amount on the market
 */
export function getTokenUiAmount(
    context: Context,
    instrumentSplToken: PublicKey,
    userAccountAddress: PublicKey
): Promise<number> {
    return new Promise((resolve, reject) => {
        findAssociatedTokenAccount(context, instrumentSplToken, userAccountAddress).then(
            (Account) => {
                context.connection.getTokenAccountBalance(Account[0]).then((amount) => {
                    if (amount.value.uiAmount !== null) {
                        resolve(amount.value.uiAmount);
                    }
                    else {
                        resolve(0);
                    }
                }).catch((err) => {
                    console.error(err);
                    reject(err)
                })
            }).catch((err) => {
                console.error(err);
                reject(err)
            })
    })
}

export function getTokenAmount(
    context: Context,
    instrumentSplToken: PublicKey,
    userAccountAddress: PublicKey
): Promise<number> {
    return new Promise((resolve, reject) => {
        findAssociatedTokenAccount(context, instrumentSplToken, userAccountAddress).then(
            (Account) => {
                context.connection.getTokenAccountBalance(Account[0]).then((amount) => {
                    if (amount.value.uiAmount !== null) {
                        resolve(amount.value.uiAmount * (10 ** amount.value.decimals));
                    }
                    else {
                        resolve(0);
                    }
                }).catch((err) => {
                    console.error(err);
                    reject(err)
                })
            }).catch((err) => {
                console.error(err);
                reject(err)
            })
    })
}

export function watchGetTokenUiAmount(
    context: Context,
    instrumentSplToken: PublicKey,
    userAccountAddress: PublicKey
): Promise<number> {
    return new Promise((resolve, reject) => {
        const waitGetTokenAmount = async () => {
            try {
                let res = await getTokenUiAmount(context, instrumentSplToken, userAccountAddress);
                resolve(res);
            } catch (e) {
                console.error(e);
                console.log("Waiting 1 second for serum settlement");
                setTimeout(waitGetTokenAmount, 1000);
            }
        }
        waitGetTokenAmount();
    })
}


/**
 * To get the user token amount on the market
 */
export function getPosition(
    context: Context,
    market: OptifiMarket,
    userAccountAddress: PublicKey,
): Promise<[number, number]> {
    return new Promise(async (resolve, reject) => {
        let longAmount = await watchGetTokenUiAmount(context, market.instrumentLongSplToken, userAccountAddress);
        let shortAmount = await watchGetTokenUiAmount(context, market.instrumentShortSplToken, userAccountAddress);
        resolve([longAmount, shortAmount])
    })
}

export interface Position {
    marketId: PublicKey;
    expiryDate: Date;
    strike: number;
    asset: "BTC" | "ETH";
    instrumentType: "Call" | "Put";
    longAmount: number;
    shortAmount: number;
    netPosition: number;
    positionType: "long" | "short";
}

/**
 * To get the user token amount on each trading market
 */
export function getUserPositions(
    context: Context,
    userAccountAddress: PublicKey
): Promise<Position[]> {
    return new Promise(async (resolve, reject) => {
        try {
            let allMarkets = await findOptifiMarkets(context)
            let userAccount = await context.program.account.userAccount.fetch(userAccountAddress);
            // // @ts-ignore
            // let userAccount = res as UserAccount;
            let positions = userAccount.positions as UserPosition[];
            let tradingMarkets = allMarkets.filter(market => positions.map(e => e.instrument.toString()).includes(market[0].instrument.toString()));
            let instrumentAddresses = tradingMarkets.map(e => e[0].instrument)
            let instrumentRawInfos = await context.program.account.chain.fetchMultiple(instrumentAddresses)
            let instrumentInfos = instrumentRawInfos as Chain[]
            let longAndShortVaults: PublicKey[] = []
            for (let i = 0; i < tradingMarkets.length; i++) {
                let market = tradingMarkets[i]
                let longMint = market[0].instrumentLongSplToken
                let shortMint = market[0].instrumentShortSplToken

                let [userLongTokenVault,] = await findAssociatedTokenAccount(context, longMint, userAccountAddress)
                let [userShortTokenVault,] = await findAssociatedTokenAccount(context, shortMint, userAccountAddress)
                longAndShortVaults.push(userLongTokenVault, userShortTokenVault)
            }

            let tokenAccountsInfos = await context.connection.getMultipleAccountsInfo(longAndShortVaults)
            let vaultBalances: number[] = []
            for (let i = 0; i < tokenAccountsInfos.length; i++) {
                let account = await getTokenAccountFromAccountInfo(tokenAccountsInfos[i]!, longAndShortVaults[i])
                vaultBalances.push((new anchor.BN(account.amount.toString())).toNumber())
            }

            let res: Position[] = tradingMarkets.map((market, i) => {
                let decimals = numberAssetToDecimal(instrumentInfos[i].asset)!
                let longAmount = vaultBalances[2 * i] / 10 ** decimals
                let shortAmount = vaultBalances[2 * i + 1] / 10 ** decimals

                let position: Position = {
                    marketId: market[1],
                    expiryDate: new Date(instrumentInfos[i].expiryDate.toNumber() * 1000),
                    strike: instrumentInfos[i].strike.toNumber(),
                    asset: instrumentInfos[i].asset == 0 ? "BTC" : "ETH",
                    instrumentType: Object.keys(instrumentInfos[i].instrumentType)[0] === "call" ? "Call" : "Put",
                    longAmount,
                    shortAmount,
                    netPosition: longAmount - shortAmount,
                    positionType: longAmount - shortAmount >= 0 ? "long" : "short",
                }
                return position
            })

            resolve(res)
        } catch (err) {
            reject(err)
        }
    })
}

export function loadPositionsFromUserAccount(
    context: Context,
    userAccount: UserAccount,
    optifiMarkets: OptifiMarketFullData[]
): Promise<Position[]> {
    return new Promise(async (resolve, reject) => {
        try {
            let positions = userAccount.positions as UserPosition[];
            let tradingMarkets = optifiMarkets.filter(market => positions.map(e => e.instrument.toString()).includes(market.instrumentAddress.toString()));
            let vaultBalances: number[] = []
            //follow the order of tradingMarkets 
            let positionsWithTradingMarkets: UserPosition[] = [];
            for (let i = 0; i < tradingMarkets.length; i++) {
                for (let j = 0; j < positions.length; j++) {
                    if (positions[j].instrument.toString() == (tradingMarkets[i].instrumentAddress.toString()))
                        positionsWithTradingMarkets.push(positions[j]);
                }
            }

            for (let i = 0; i < positionsWithTradingMarkets.length; i++) {
                // @ts-ignore
                vaultBalances.push(positionsWithTradingMarkets[i].longQty.toNumber());
                // @ts-ignore
                vaultBalances.push(positionsWithTradingMarkets[i].shortQty.toNumber());
            }

            let res: Position[] = tradingMarkets.map((market, i) => {
                // decimals = numberAssetToDecimal(instrumentInfos[i].asset)!

                let longAmount = vaultBalances[2 * i] / 10 ** DECIMAL
                let shortAmount = vaultBalances[2 * i + 1] / 10 ** DECIMAL

                let position: Position = {
                    marketId: market.marketAddress,
                    //expiryDate: new Date(instrumentInfos[i].expiryDate.toNumber() * 1000),
                    expiryDate: new Date(dateToAnchorTimestamp(market.expiryDate).toNumber() * 1000),
                    // strike: instrumentInfos[i].strike.toNumber(),
                    strike: market.strike,
                    // asset: instrumentInfos[i].asset == 0 ? "BTC" : "ETH",
                    asset: market.asset,
                    // instrumentType: Object.keys(instrumentInfos[i].instrumentType)[0] === "call" ? "Call" : "Put",
                    instrumentType: market.instrumentType,
                    longAmount,
                    shortAmount,
                    netPosition: longAmount - shortAmount,
                    positionType: longAmount - shortAmount >= 0 ? "long" : "short",
                }
                return position
            })

            resolve(res)
        } catch (err) {
            reject(err)
        }
    })
}