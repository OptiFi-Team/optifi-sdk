
import { OptifiMarketFullData, Position } from "../utils/market";
import Context from "../types/context";

/**
 * get instrument info for all optifi markets
 * 
 *  *
 * @param context Context to use
 *
 * @param userPositions
 * 
 * @param optifiMarkets
 * 
 * @return An array of numbers which are the market prices for each user’s position
 */
export function getMarketPrice(
    context: Context,
    userPositions: Position[],
    optifiMarkets: OptifiMarketFullData[],
): Promise<number[]> {
    return new Promise(async (resolve, reject) => {
        try {
            let prices: number[] = []

            userPositions.forEach(position => {
                let market = optifiMarkets.find(market => market.marketAddress.toString() == position.marketId.toString())!

                if (position.positionType == "long")
                    prices.push(market.bidPrice);
                else if (position.positionType == "short")
                    prices.push(market.askPrice);
            })
            resolve(prices)
        } catch (err) {
            reject(err)
        }
    })
}