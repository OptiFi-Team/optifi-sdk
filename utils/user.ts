import Context from "../types/context";
import { findUserAccount, userAccountExists, findExchangeAccount } from "./accounts";
import { Chain, UserAccount } from "../types/optifi-exchange-types";
import { PublicKey } from "@solana/web3.js";
import { findOptifiMarketsWithFullData, getUserPositions, Position } from "./market";
import { getAllTradesForAccount, Trade } from "./tradeHistory";
import Decimal from "decimal.js";
import { BN } from "@project-serum/anchor";
import {
    dateToAnchorTimestamp,
} from "../utils/generic";
import { getTradePrice } from "./getTradePrice"
export function getAmountToReserve(
    context: Context
): Promise<number> {
    return new Promise(async (resolve, reject) => {
        let acctExists = true;
        let [userAccountAddress, _] = await findUserAccount(context);
        let res = await context.program.account.userAccount.fetch(userAccountAddress);
        // @ts-ignore
        let userAccount = res as UserAccount;
        if (acctExists) {
            let total_margin = 0;
            for (let x of userAccount.amountToReserve) {
                let margin = x.toNumber();
                margin /= 10 ** 6; // devided with USDC decimals 6
                if (margin > 0) {
                    total_margin += margin;
                    console.log(margin);
                }
            }
            console.log("Total Margin Required: ", total_margin);
            resolve(total_margin);
        } else {
            reject("User Account not Exists")
        }
    });
}

export function getUserBalance(
    context: Context
): Promise<number> {
    return new Promise((resolve, reject) => {
        userAccountExists(context)
            .then(([acctExists, res]) => {
                let userAccount = res as UserAccount;
                context.connection.getTokenAccountBalance(userAccount.userMarginAccountUsdc).then(tokenAmount => {
                    console.log("userMarginAccount : ", userAccount.userMarginAccountUsdc.toString());
                    console.log("decimals : ", tokenAmount.value.decimals);
                    console.log("balance : ", tokenAmount.value.uiAmount);
                    if (tokenAmount.value.uiAmount != null) {
                        resolve(tokenAmount.value.uiAmount);
                    }
                }).catch((err) => reject(err));
            })
            .catch((err) => reject(err));

    });
}

async function userTradesHistoryFilterByDate(context: Context, userTradesHistory?: Trade[]): Promise<Trade[]> {
    return new Promise(async (resolve, reject) => {
        let markets = await findOptifiMarketsWithFullData(context);

        //find all match market address in userTradesHistory
        //@ts-ignore
        let marketAddress: string[] = userTradesHistory.map(e => { return e.marketAddress });
        marketAddress = [...new Set(marketAddress)]//delete repeat element

        //in userTradesHistory, there will be [marketA marketA marketB marketB marketC marketC...],
        //so before filter trade by time, check the market address is match
        //marketA -> instrumentA/startA/expiryDateA
        for (let marketAddressFromUserTradesHistory of marketAddress) {
            let res = markets.find((e) => e.marketAddress.toString() === marketAddressFromUserTradesHistory)
            markets = markets.filter((e) => e.marketAddress.toString() != res?.marketAddress.toString())//delete found market 
            if (res) {
                let tmpInstrumentAddress: string[] = [];
                tmpInstrumentAddress.push(res.instrumentAddress.toString());
                let instrumentRawInfos = await context.program.account.chain.fetchMultiple(tmpInstrumentAddress)
                let instrumentInfos = instrumentRawInfos as Chain[]

                let start = instrumentInfos[0].start;
                let expiryDate = instrumentInfos[0].expiryDate;

                //@ts-ignore
                userTradesHistory = userTradesHistory.filter((e) => {
                    // number to date example: expiryDate: new Date(instrumentInfos[i].expiryDate.toNumber() * 1000)
                    // date to number: dateToAnchorTimestamp()
                    let historyDate: BN = dateToAnchorTimestamp(e.timestamp);

                    let marketAddressMatch = (e.marketAddress.toString() === marketAddressFromUserTradesHistory) ? true : false;
                    let historyDateInRange = (historyDate < start || historyDate > expiryDate) ? false : true
                    return (marketAddressMatch && !historyDateInRange) ? false : true;
                })
            }
        }
        //@ts-ignore
        resolve(userTradesHistory)

    })
}

export function calcPnLForUserPositions(
    context: Context,
    userAccountAddress?: PublicKey,
    userPositions?: Position[],
    marketPrices?: number[],
    userTradesHistory?: Trade[]
): Promise<PnL[]> {
    return new Promise(async (resolve, reject) => {
        try {
            if (!userAccountAddress) {
                [userAccountAddress,] = await findUserAccount(context)
            }

            // get all positions of the user account
            if (!userPositions) {
                userPositions = await getUserPositions(context, userAccountAddress)
                userPositions = userPositions.filter(e => e.netPosition != 0)
            }

            // get user's trade history
            if (!userTradesHistory) {
                userTradesHistory = await getAllTradesForAccount(context, userAccountAddress)
            }

            //filter and renew userTradesHistory
            console.log("before filter: " + userTradesHistory.length);
            if (userTradesHistory)
                userTradesHistory = await userTradesHistoryFilterByDate(context, userTradesHistory);
            console.log("after filter: " + userTradesHistory.length);

            if (!marketPrices) {
                // get the current market price
                let marketsInfos = await findOptifiMarketsWithFullData(context)

                let prices: number[] = []
                userPositions.forEach(position => {
                    let market = marketsInfos.find(market => market.marketAddress.toString() == position.marketId.toString())!
                    prices.push((market.askPrice + market.bidPrice) / 2)
                })
                marketPrices = prices
            }

            let positionPnLs: PnL[] = [];
            for (let i = 0; i < userPositions.length; i++) {
                positionPnLs.push(await calPnLForOnePosition(userPositions[i], marketPrices![i], userTradesHistory!, userAccountAddress!))
            }
            resolve(positionPnLs)
        } catch (err) {
            reject(err)
        }
    })
}

interface PnL {
    // optifi market address
    marketAddress: PublicKey
    // user's entry price for the holding position
    avgEntryPrice: number,
    // current market price of user's holding position
    marketPrice: number,
    // user's pnl based avgEntryPrice, marketPrice, and user's holding positions
    pnl: number
}

export async function calPnLForOnePosition(postion: Position, marketPrice: number, tradeHistory: Trade[], userAccountAddress: PublicKey): Promise<PnL> {
    let pnl: number = 0
    let netPosition = postion.netPosition
    let entryUnitPrice: number = 0
    if (netPosition != 0) {
        // get entry price from trade history
        let relatedTrades = tradeHistory.filter(e => e.marketAddress.toString() == postion.marketId.toString())
        let netBaseAmount = new Decimal(0)
        let netQuoteAmount = 0
        let totalAmount = 0
        for (let i = 0; i < relatedTrades.length; i++) {
            let e = relatedTrades[i]
            // relatedTrades.forEach(async (e) => {
            let maxBaseQuantity = (e.side == "buy") ? e.maxBaseQuantity : -e.maxBaseQuantity;
            if (!userAccountAddress) console.log("no userAccountAddress!")
            let data = {
                optifiProgramId: process.env.OPTIFI_PROGRAM_ID,
                clientOrderId: e.clientId.toString(),
                userAccountAddress: userAccountAddress,
            }
            let tradePrice = await getTradePrice(data)
            tradePrice = tradePrice.result[0]
            if (!tradePrice) {
                console.log("no tradePrice!")
                tradePrice = -1
            }
            totalAmount += tradePrice * maxBaseQuantity

            if (e.side === "buy") {
                // netQuoteAmount -= e.maxQuoteQuantity
                netBaseAmount = netBaseAmount.add(new Decimal(e.maxBaseQuantity))
            } else {
                // netQuoteAmount += e.maxQuoteQuantity
                netBaseAmount = netBaseAmount.sub(new Decimal(e.maxBaseQuantity))
            }
        }

        if (!netBaseAmount.equals(new Decimal(0))) {
            // entryUnitPrice = Math.abs(new Decimal(netQuoteAmount).div(new Decimal(netBaseAmount)).toNumber())
            // console.log("netPosition: ", netPosition, marketPrice, entryUnitPrice)

            entryUnitPrice = Math.abs(new Decimal(totalAmount).div(new Decimal(netBaseAmount)).toNumber())

            // calc pnl
            pnl = netPosition * (marketPrice - entryUnitPrice)
        } else { console.log("netBaseAmount = 0") }

    }
    return {
        marketAddress: postion.marketId,
        marketPrice,
        avgEntryPrice: entryUnitPrice,
        pnl,

    }
}