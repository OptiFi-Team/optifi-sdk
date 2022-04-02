import Context from "../types/context";
import { findOptifiMarkets, OptifiMarketFullData } from "./market"
import { findUserAccount } from "./accounts";
import { OracleDataType } from "../types/optifi-exchange-types";
import { option_delta } from "./calculateMargin";
import { getSpotnIv } from "./calcMarginRequirementForUser";
import { PublicKey } from "@solana/web3.js";
import { parseAggregatorAccountData } from "@switchboard-xyz/switchboard-api"
import { SWITCHBOARD, USDC_DECIMALS } from "../constants";

export const r = 0;
export const q = 0;
export const stress = 0.3;

function reshap(arr: number[]) {

    const newArr: number[][] = [];
    while (arr.length) newArr.push(arr.splice(0, 1));
    return newArr
}

export function calculateOptionDelta(
    context: Context, 
    optifiMarket: OptifiMarketFullData[]
): Promise<number[]> {
    return new Promise(async (resolve, reject) => {
        try{
            let t: number[] = [];
            let isCall: number[] = [];
            let strike: number[] = [];

            let spotRes = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD));
            spotRes = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD))

            let ivRes = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_IV))
            ivRes = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_IV))

            let usdcSpot = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_USDC_USD))

            let spot = spotRes.lastRoundResult?.result! / usdcSpot.lastRoundResult?.result!
            let iv = ivRes.lastRoundResult?.result! / 100

            optifiMarket.map(async (market) => {
                // @ts-ignore
                t.push((market.expiryDate.getTime() - new Date().getTime()) / (60 * 60 * 24 * 365) / 1000);
                isCall.push(Object.keys(market.instrumentType)[0] === "call" ? 1 : 0);
                strike.push(market.strike);
            })

            resolve(option_delta(spot, reshap(strike), iv, r, q, reshap(t), reshap(isCall)));
        }
        catch (err) {
            reject(err);
        }
    })
}