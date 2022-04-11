import { ndf, d2, reshap } from "./calculateMargin"
import { STRIKE, PREMIUM, IS_CALL, TIME_TO_MATURITY } from "./calcMarginTestData"
import Context from "../types/context";
import { parseAggregatorAccountData } from "@switchboard-xyz/switchboard-api"
import { SWITCHBOARD, USDC_DECIMALS } from "../constants";
import { PublicKey } from "@solana/web3.js";
import { OptifiMarketFullData, Position } from "./market";
import { option_delta } from "./calculateMargin";
import { resolve } from "path";
import { rejects } from "assert";

interface ProfitChance {
    breakEven: number,
    profitChance: number
}
interface ProfitChanceRes {
    buy: ProfitChance,
    sell: ProfitChance,
}
interface Premiumtype {
    askPrice: number,
    bidPrice: number,
}
interface BreakEvenDataSingleRes {
    spot: number,
    iv: number,
    t: number,
    isCall: number,
    strike: number,
    premium: Premiumtype,
}
interface BreakEvenDataRes extends Array<BreakEvenDataSingleRes> { }
export const r = 0;
export const q = 0;
/**
 * calc break even and profit chance for all optifi markets
 * 
 *  *
 * @param context Context to use
 *
 * @param optifiMarkets
 * 
 * @return An array of ProfitChanceRes for each optifi market
 */
export function calcProfitChance(
    context: Context,
    optifiMarkets: OptifiMarketFullData[],
): Promise<ProfitChanceRes[]> {
    return new Promise(async (resolve, reject) => {
        try {

            // =====================================================
            // TODO: use the data in optifiMarkets to calc break even 
            // and profit chance with the finished functions below
            // the length of returned array should be equal to length of optifiMarkets
            // =====================================================

            let break_even_data = await getBreakEvenData(context, optifiMarkets)//get spot , iv , r , q , t , strike
            //break_even_arr[0]: askPrice break even
            //break_even_arr[1]: bidPrice break even
            let break_even_arr = await calcBreakEven(break_even_data);

            console.log(break_even_arr);
            let res: ProfitChanceRes[] = [];
            //TODO
            //spot 和iv 都只會有兩種,所以只要call 兩次d2就可以了

            // resolve(res);
        } catch (err) {
            reject(err)
        }
    })
}

function getBreakEvenData(
    context: Context,
    optifiMarkets: OptifiMarketFullData[]
): Promise<BreakEvenDataRes> {
    return new Promise(async (resolve, rejects) => {
        try {
            let spotRes_btc = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD));
            let ivRes_btc = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_IV))

            let spotRes_eth = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_USD));
            let ivRes_eth = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_IV))

            let usdcSpot = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_USDC_USD))

            let spot_btc = spotRes_btc.lastRoundResult?.result! / usdcSpot.lastRoundResult?.result!
            let iv_btc = ivRes_btc.lastRoundResult?.result! / 100
            let spot_eth = spotRes_eth.lastRoundResult?.result! / usdcSpot.lastRoundResult?.result!
            let iv_eth = ivRes_eth.lastRoundResult?.result! / 100

            let today = new Date().getTime();
            let res: BreakEvenDataRes = optifiMarkets.map(market => {
                let spot: number;
                let iv: number;
                switch (market.asset) {
                    case "BTC":
                        spot = spot_btc
                        iv = iv_btc
                        break
                    case "ETH":
                        spot = spot_eth
                        iv = iv_eth
                        break
                }
                let t: number = (market.expiryDate.getTime() / 1000 - today / 1000) / (60 * 60 * 24 * 365);
                let isCall: number = market.instrumentType === "Call" ? 1 : 0;
                let strike: number = market.strike;
                let premium: Premiumtype = {
                    askPrice: market.askPrice,
                    bidPrice: market.bidPrice,
                }
                return {
                    spot: spot,
                    iv: iv,
                    t: t,
                    isCall: isCall,
                    strike: strike,
                    premium: premium
                }
            })

            resolve(res)
        } catch (err) {
            rejects(err)
        }
    })
}

function calcBreakEven(
    break_even_data: BreakEvenDataRes
): Promise<Array<Array<number>>> {
    return new Promise(async (resolve, rejects) => {
        try {
            let len = break_even_data.length;
            let res = new Array<Array<number>>()
            let sign: number;
            for (let len = 0; len < 2; len++) {
                res.push([]);
            }
            for (let i = 0; i < len; i++) {
                sign = (break_even_data[i].isCall == 1) ? 1 : -1;
                //askPrice break even
                res[0].push(break_even_data[i].strike + sign * break_even_data[i].premium.askPrice);
                //bidPrice break even
                res[1].push(break_even_data[i].strike + sign * break_even_data[i].premium.bidPrice);
            }
            resolve(res);
        } catch (err) {
            rejects(err);
        }
    })


    // let lenIsSame = (
    //     (STRIKE.length == PREMIUM.length) &&
    //     (STRIKE.length == IS_CALL.length) &&
    //     (STRIKE.length == TIME_TO_MATURITY.length)
    // )
    // if (!lenIsSame) {
    //     console.log("check element amount in calcMarginTestData!")
    //     console.log("STRIKE.length: " + STRIKE.length);
    //     console.log("PREMIUM.length: " + PREMIUM.length);
    //     console.log("IS_CALL.length: " + IS_CALL.length);
    //     console.log("TIME_TO_MATURITY.length: " + TIME_TO_MATURITY.length);
    //     return [];
    // }
    // let len = (STRIKE.length > PREMIUM.length) ? STRIKE.length : PREMIUM.length;
    // let res: number[] = [];
    // let sign: number;
    // for (let i = 0; i < len; i++) {
    //     sign = (IS_CALL[i] == 1) ? 1 : -1;
    //     res.push(STRIKE[i] + sign * PREMIUM[i]);
    // }
    // return res;
}

// export function calcNDF(
//     context: Context,
//     spot: number,
//     iv: number,
//     r: number,
//     q: number,
// ): Promise<number[]> {
//     return new Promise(async (resolve, reject) => {
//         try {
//             let break_even_arr = calcBreakEven();
//             let break_even = reshap(break_even_arr);

//             let t = reshap(TIME_TO_MATURITY);

//             let d2_result = d2(spot, break_even, iv, r, q, t)
//             let ndf_result = ndf(d2_result);

//             console.log("profit chance:");
//             console.log(ndf_result);
//             resolve(ndf_result);
//         } catch (err) {
//             reject(err)
//         }
//     })
// }
