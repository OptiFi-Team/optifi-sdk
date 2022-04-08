import { ndf, d2, reshap } from "./calculateMargin"
import { STRIKE, PREMIUM, IS_CALL, TIME_TO_MATURITY } from "./calcMarginTestData"
import Context from "../types/context";

import { OptifiMarketFullData, Position } from "./market";

interface ProfitChance {
    breakEven: number,
    profitChance: number
}
interface ProfitChanceRes {
    buy: ProfitChance,
    sell: ProfitChance,
}

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

        } catch (err) {
            reject(err)
        }
    })
}


function calcBreakEven() {
    let lenIsSame = (
        (STRIKE.length == PREMIUM.length) &&
        (STRIKE.length == IS_CALL.length) &&
        (STRIKE.length == TIME_TO_MATURITY.length)
    )
    if (!lenIsSame) {
        console.log("check element amount in calcMarginTestData!")
        console.log("STRIKE.length: " + STRIKE.length);
        console.log("PREMIUM.length: " + PREMIUM.length);
        console.log("IS_CALL.length: " + IS_CALL.length);
        console.log("TIME_TO_MATURITY.length: " + TIME_TO_MATURITY.length);
        return [];
    }
    let len = (STRIKE.length > PREMIUM.length) ? STRIKE.length : PREMIUM.length;
    let res: number[] = [];
    let sign: number;
    for (let i = 0; i < len; i++) {
        sign = (IS_CALL[i] == 1) ? 1 : -1;
        res.push(STRIKE[i] + sign * PREMIUM[i]);
    }
    return res;
}

export function calcNDF(
    context: Context,
    spot: number,
    iv: number,
    r: number,
    q: number,
): Promise<number[]> {
    return new Promise(async (resolve, reject) => {
        try {
            let break_even_arr = calcBreakEven();
            let break_even = reshap(break_even_arr);

            let t = reshap(TIME_TO_MATURITY);

            let d2_result = d2(spot, break_even, iv, r, q, t)
            let ndf_result = ndf(d2_result);

            console.log("profit chance:");
            console.log(ndf_result);
            resolve(ndf_result);
        } catch (err) {
            reject(err)
        }
    })
}
