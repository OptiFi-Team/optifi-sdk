import Context from "../types/context";
import { OptifiMarketFullData } from "./market"
import { OracleDataType } from "../types/optifi-exchange-types";
import { imp_vol_call, imp_vol_put } from "./calculateMargin";
import { PublicKey } from "@solana/web3.js";
import { parseAggregatorAccountData } from "@switchboard-xyz/switchboard-api"
import { SWITCHBOARD, USDC_DECIMALS } from "../constants";

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
            // get Spot price too just like optionDeltafunction
            let tCall: number[] = [];
            let tPut: number[] = [];
            let strikeCall: number[] = [];
            let strikePut: number[] = [];
            let priceCall: number[] = [];
            let pricePut: number[] = [];

            let spotRes = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD));
            spotRes = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD))

            let usdcSpot = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_USDC_USD))

            let spot = spotRes.lastRoundResult?.result! / usdcSpot.lastRoundResult?.result!


            optifiMarket.map(async (market) => {
                if(market.instrumentType === "Call") {
                    // @ts-ignore
                    tCall.push(((market.expiryDate.getTime() - new Date().getTime())/ (60 * 60 * 24 * 365)) / 1000);
                    strikeCall.push(market.strike);
                    priceCall.push(market.bidPrice ? market.askPrice : market.bidPrice);
                }
                else {
                    // @ts-ignore
                    tPut.push(((market.expiryDate.getTime() - new Date().getTime())/ (60 * 60 * 24 * 365)) / 1000);
                    strikePut.push(market.strike);
                    pricePut.push(market.bidPrice ? market.askPrice : market.bidPrice);
                }
            })

            // console.log('spot: ', spot)
            console.log('tCall: ', tCall)
            console.log('tPut: ', tPut)

            resolve({
                IV_call: imp_vol_call(spot, reshap(strikeCall), reshap(priceCall), r, q, reshap(tCall)),
                IV_put: imp_vol_put(spot, reshap(strikePut), reshap(pricePut), r, q, reshap(tPut))
            })
        }
        catch (err) {
            reject(err);
        }
    })    
}