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
    IV_call_bid: number | number[],
    IV_call_ask: number | number[],
    IV_put_bid: number | number[],
    IV_put_ask: number | number[]
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
            let tCall1: number[] = [];
            let tPut: number[] = [];
            let tPut1: number[] = [];
            let strikeCall: number[] = [];
            let strikeCall1: number[] = [];
            let strikePut: number[] = [];
            let strikePut1: number[] = [];
            let bidpriceCall: number[] = [];
            let askpriceCall: number[] = [];
            let bidpricePut: number[] = [];
            let askpricePut: number[] = [];
            let ivResult: number[] = [];

            let spotRes = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD));
            spotRes = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD))

            let usdcSpot = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_USDC_USD))

            let spot = spotRes.lastRoundResult?.result! / usdcSpot.lastRoundResult?.result!


            optifiMarket.map(async (market) => {
                if(market.instrumentType === "Call") {
                    // @ts-ignore
                    // let t = ((market.expiryDate.getTime() - new Date().getTime())/ (60 * 60 * 24 * 365)) / 1000;
                    // let strike = market.strike;
                    // let price = (market.bidPrice ? market.askPrice : market.bidPrice);
                    // ivResult.push(imp_vol_call(spot, strike, price, r, q, t))
                    //tCall.push(((market.expiryDate.getTime() - new Date().getTime())/ (60 * 60 * 24 * 365)) / 1000);
                    tCall.push(0.0254814);
                    tCall1.push(0.0254814);
                    strikeCall.push(market.strike);
                    strikeCall1.push(market.strike);
                    // each market has both ask and bid price
                    bidpriceCall.push(market.bidPrice);
                    askpriceCall.push(market.askPrice);
                }
                else {
                    // @ts-ignore
                    // tPut.push(((market.expiryDate.getTime() - new Date().getTime())/ (60 * 60 * 24 * 365)) / 1000);
                    tPut.push(0.0254814);
                    tPut1.push(0.0254814);
                    strikePut.push(market.strike);
                    strikePut1.push(market.strike);
                    bidpricePut.push(market.bidPrice);
                    askpricePut.push(market.askPrice);
                }
            })

            console.log('strikeCall: ', strikeCall)
            console.log('strikePut: ', strikePut)
            console.log('tCall: ', tCall)
            console.log('tPut: ', tPut)
            console.log('bidpriceCall: ', bidpriceCall)
            console.log('askpriceCall: ', askpriceCall)
            console.log('bidpricePut: ', bidpricePut)
            console.log('askpricePut: ', askpricePut)

            resolve({
                IV_call_bid: imp_vol_call(spot, reshap(strikeCall), reshap(bidpriceCall), r, q, reshap(tCall)),
                IV_call_ask: imp_vol_call(spot, reshap(strikeCall1), reshap(askpriceCall), r, q, reshap(tCall1)),
                IV_put_bid: imp_vol_put(spot, reshap(strikePut), reshap(bidpricePut), r, q, reshap(tPut)),
                IV_put_ask: imp_vol_put(spot, reshap(strikePut1), reshap(askpricePut), r, q, reshap(tPut1)),
            })
        }
        catch (err) {
            reject(err);
        }
    })    
}