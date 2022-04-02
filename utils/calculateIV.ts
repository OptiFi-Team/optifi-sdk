import Context from "../types/context";
import { OptifiMarketFullData } from "./market"
import { OracleDataType } from "../types/optifi-exchange-types";
import { imp_vol_call, imp_vol_put } from "./calculateMargin";

// imp_vol_put(spot, strike, price, r, q, t)
export const spot = OracleDataType.Spot;
export const r = 0;
export const q = 0;

interface IVResult {
    IV_call: number | number[],
    IV_put: number | number[]
}

function reshap(arr: number[]) {

    const newArr: number[][] = [];
    while (arr.length) newArr.push(arr.splice(0, 1));
    return newArr
}

export function calculateIV(
    context: Context,
    optifiMarket: OptifiMarketFullData[]
): Promise<IVResult> {
    return new Promise(async (resolve, reject) => {
        try {
            let tCall: number[] = [];
            let tPut: number[] = [];
            let strikeCall: number[] = [];
            let strikePut: number[] = [];
            let priceCall: number[] = [];
            let pricePut: number[] = [];

            optifiMarket.map(async (market) => {
                if(market.instrumentType === "Call") {
                    // @ts-ignore
                    tCall.push((market.expiryDate.getTime() - new Date().getTime() / 1000) / (60 * 60 * 24 * 365));
                    strikeCall.push(market.strike);
                    priceCall.push(market.bidPrice ? market.askPrice : market.bidPrice);
                }
                else {
                    // @ts-ignore
                    tPut.push((market.expiryDate.getTime() - new Date().getTime() / 1000) / (60 * 60 * 24 * 365));
                    strikePut.push(market.strike);
                    pricePut.push(market.bidPrice ? market.askPrice : market.bidPrice);
                }
            })

            // console.log('spot: ', spot)
            // console.log('tCall: ', tCall)
            // console.log('tPut: ', tPut)
            // console.log('strikeCall: ', strikeCall)
            // console.log('strikePut: ', strikePut)
            // console.log('priceCall: ', priceCall)
            // console.log('pricePut: ', pricePut)

            resolve({
                IV_call: imp_vol_call(48400, reshap(strikeCall), reshap(priceCall), r, q, reshap(tCall)),
                IV_put: imp_vol_put(48400, reshap(strikePut), reshap(pricePut), r, q, reshap(tPut))
            })
        }
        catch (err) {
            reject(err);
        }
    })    
}