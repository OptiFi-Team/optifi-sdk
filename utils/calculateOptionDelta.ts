import Context from "../types/context";
import { OptifiMarketFullData } from "./market"
import { option_delta, option_gamma, option_vega } from "./calculateMargin";
import { PublicKey } from "@solana/web3.js";
import { PYTH } from "../constants";
import { getPythData } from "./pyth";
import { getGvolIV } from "./getGvolIV";
import Asset from "../types/asset";

export const r = 0;
export const q = 0;

interface OptionGreeksData {
    spot: number,
    strike: number[][],
    iv: number,
    r: number,
    q: number,
    t: number[][],
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
): Promise<number[]> {
    return new Promise(async (resolve, reject) => {
        try {
            let res: any = [];
            let data = await prepareGreeksData(context, optifiMarket)
            for (let i = 0; i < optifiMarket.length; i++) {
                let isCall = optifiMarket[i].instrumentType === "Call" ? 1 : 0
                let temp = option_delta(data[i].spot, data[i].strike, data[i].iv, data[i].r, data[i].q, data[i].t, reshap([isCall]))
                res.push(Number(Number(temp[0][0]).toFixed(2)))
            }

            resolve(res)
        }
        catch (err) {
            reject(err);
        }
    })
}

export function calculateOptionGamma(
    context: Context,
    optifiMarket: OptifiMarketFullData[]
): Promise<any[]> {
    return new Promise(async (resolve, reject) => {
        try {
            let res: any = [];
            let data = await prepareGreeksData(context, optifiMarket)
            for (let i = 0; i < optifiMarket.length; i++) {
                let temp = option_gamma(data[i].spot, data[i].strike, data[i].iv, data[i].r, data[i].q, data[i].t)
                res.push(temp[0][0])
            }

            resolve(res)
        }
        catch (err) {
            reject(err);
        }
    })
}

export function calculateOptionVega(
    context: Context,
    optifiMarket: OptifiMarketFullData[]
): Promise<any[]> {
    return new Promise(async (resolve, reject) => {
        try {
            let res: any = [];
            let data = await prepareGreeksData(context, optifiMarket)
            for (let i = 0; i < optifiMarket.length; i++) {
                let temp = option_vega(data[i].spot, data[i].strike, data[i].iv, data[i].r, data[i].q, data[i].t)
                res.push(temp[0][0])
            }

            resolve(res)
        }
        catch (err) {
            reject(err);
        }
    })
}

export async function prepareGreeksData(
    context: Context,
    optifiMarket: OptifiMarketFullData[]
): Promise<OptionGreeksData[]> {
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
                let optionGreeksData: OptionGreeksData = {
                    spot: spot,
                    strike: reshap([market.strike]),
                    iv: iv,
                    r: r,
                    q: q,
                    t: reshap([t]),
                }
                res.push(optionGreeksData)
            }

            resolve(res)
        }
        catch (err) {
            reject(err);
        }
    })
}
