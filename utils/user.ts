import Context from "../types/context";
import { findUserAccount, userAccountExists, } from "./accounts";
import { UserAccount, } from "../types/optifi-exchange-types";
import { PublicKey } from "@solana/web3.js";
import { findOptifiMarketsWithFullData, getUserPositions, Position } from "./market";
import { getAllTradesForAccount, Trade } from "./tradeHistory";
import Decimal from "decimal.js";


export function getAmountToReserve(
    context: Context
): Promise<number> {
    return new Promise((resolve, reject) => {
        userAccountExists(context)
            .then(([acctExists, res]) => {
                if (acctExists) {
                    let userAccount = res as UserAccount;
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
            })
            .catch((err) => reject(err));

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

export function calcPnLForUserPositions(
    context: Context,
    userAccountAddress?: PublicKey,
    userPositions?: Position[],
    marketPrices?: number[],
    userTradesHistory?: Trade[]
): Promise<number[]> {
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

            if (!marketPrices) {
                // get the current market price
                let marketsInfos = await findOptifiMarketsWithFullData(context)

                let prices: number[] = []
                userPositions.forEach(position => {
                    let market = marketsInfos.find(market => market.marketAddress.toString() == position.marketId.toString())!
                    prices.push(market.askPrice + market.bidPrice / 2)
                })
                marketPrices = prices
            }

            let positionPnLs = userPositions.map((position, i) => calPnLForOnePosition(position, marketPrices![i], userTradesHistory!))
          
            resolve(positionPnLs)
        } catch (err) {
            reject(err)
        }
    })
}

export function calPnLForOnePosition(postion: Position, marketPrice: number, tradeHistory: Trade[]): number {
    let pnl: number = 0
    let netPosition = postion.netPosition
    if (netPosition != 0) {
        // get entry price from trade history
        let relatedTrades = tradeHistory.filter(e => e.marketAddress.toString() == postion.marketId.toString())
        let netBaseAmount = 0
        let netQuoteAmount = 0
        relatedTrades.forEach(e => {
            if (e.side === "buy") {
                netQuoteAmount -= e.maxQuoteQuantity
                netBaseAmount += e.maxBaseQuantity
            } else {
                netQuoteAmount += e.maxQuoteQuantity
                netBaseAmount -= e.maxBaseQuantity

            }
        })
        let entryUnitPrice = new Decimal(netQuoteAmount).div(new Decimal(netBaseAmount)).toNumber()
        // console.log("netPosition: ", netPosition, marketPrice, entryUnitPrice)
       
        // calc pnl
        pnl = netPosition * (marketPrice + entryUnitPrice)
    }
    return pnl
}