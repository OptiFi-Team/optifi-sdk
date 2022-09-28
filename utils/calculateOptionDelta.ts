import Context from "../types/context";
import { OptifiMarketFullData } from "./market"
import { option_delta } from "./calculateMargin";
import { PublicKey } from "@solana/web3.js";
import { PYTH } from "../constants";
import { getPythData } from "./pyth";
import { getGvolIV } from "./getGvolIV";
import Asset from "../types/asset";

export const r = 0;
export const q = 0;
export const stress = 0.3;

interface OptionDeltaResult {
    OptionDelta_btc: number | number[],
    OptionDelta_eth: number | number[],
}

function reshap(arr: number[]) {

    const newArr: number[][] = [];
    while (arr.length) newArr.push(arr.splice(0, 1));
    return newArr
}

/**
 * calculate delta for each instrument listed optifi markets
 * 
 *  *
 * @param context Context to use
 *
 * @param optifiMarkets
 * 
 * @return An array of numbers which are the deltas for the instruments of optifiMarkets
 */
export function calculateOptionDelta(
    context: Context,
    optifiMarket: OptifiMarketFullData[]
): Promise<any[]> {
    return new Promise(async (resolve, reject) => {
        try {
            let usdcSpot = await getPythData(context, new PublicKey(PYTH[context.cluster].USDC_USD))
            let today = new Date().getTime();
            let res: any = [];

            // TODO: check the expiryDate
            let spotRes_btc = await getPythData(context, new PublicKey(PYTH[context.cluster].BTC_USD));
            let [ivRes_btc] = await getGvolIV(Asset.Bitcoin, optifiMarket[0].expiryDate.getTime())
            let spotRes_eth = await getPythData(context, new PublicKey(PYTH[context.cluster].ETH_USD));
            let [ivRes_eth] = await getGvolIV(Asset.Ethereum, optifiMarket[0].expiryDate.getTime())
            let spotRes_sol = await getPythData(context, new PublicKey(PYTH[context.cluster].SOL_USD));
            let [ivRes_sol] = await getGvolIV(Asset.Solana, optifiMarket[0].expiryDate.getTime())

            for (let market of optifiMarket) {
                let spot: number;
                let iv: number;
                switch (market.asset) {
                    case "BTC":
                        spot = Math.round(spotRes_btc / usdcSpot * 100) / 100
                        iv = ivRes_btc / 100
                        break
                    case "ETH":
                        spot = Math.round(spotRes_eth / usdcSpot * 100) / 100
                        iv = ivRes_eth / 100
                        break
                    case "SOL":
                        spot = Math.round(spotRes_sol / usdcSpot * 100) / 100
                        iv = ivRes_sol / 100
                        break
                }
                let t = (market.expiryDate.getTime() / 1000 - today / 1000) / (60 * 60 * 24 * 365);
                let isCall = market.instrumentType === "Call" ? 1 : 0
                let temp = option_delta(spot, reshap([market.strike]), iv, r, q, reshap([t]), reshap([isCall]))
                res.push(temp[0][0])
            }

            resolve(res)
        }
        catch (err) {
            reject(err);
        }
    })
}
