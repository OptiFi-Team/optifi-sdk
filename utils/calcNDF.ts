import { ndf, d2, reshap } from "./calculateMargin"
import { STRIKE, PREMIUM, IS_CALL, TIME_TO_MATURITY } from "./calcMarginTestData"
import Context from "../types/context";

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
