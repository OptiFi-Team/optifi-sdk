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

interface OptionDeltaResult {
    OptionDelta_btc: number | number[],
    OptionDelta_eth: number | number[],
}

function reshap(arr: number[]) {

    const newArr: number[][] = [];
    while (arr.length) newArr.push(arr.splice(0, 1));
    return newArr
}

export function calculateOptionDelta(
    context: Context, 
    optifiMarket: OptifiMarketFullData[]
): Promise<OptionDeltaResult> {
    return new Promise(async (resolve, reject) => {
        try{
            let t_btc: number[] = [];
            let isCall_btc: number[] = [];
            let strike_btc: number[] = [];

            let t_eth: number[] = [];
            let isCall_eth: number[] = [];
            let strike_eth: number[] = [];

            let today = new Date().getTime();

            let spotRes_btc = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD));
            spotRes_btc = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD))
            let ivRes_btc = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_IV))
            ivRes_btc = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_IV))

            let spotRes_eth = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_USD));
            spotRes_eth = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_USD))
            let ivRes_eth = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_IV))
            ivRes_eth = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_IV))

            let usdcSpot = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_USDC_USD))

            let spot_btc = spotRes_btc.lastRoundResult?.result! / usdcSpot.lastRoundResult?.result!
            let iv_btc = ivRes_btc.lastRoundResult?.result! / 100
            let spot_eth = spotRes_eth.lastRoundResult?.result! / usdcSpot.lastRoundResult?.result!
            let iv_eth = ivRes_eth.lastRoundResult?.result! / 100

            optifiMarket.map(async (market) => {
                switch(market.asset) {
                    case "BTC":
                        t_btc.push((market.expiryDate.getTime() - today) / (60 * 60 * 24 * 365) / 1000);
                        isCall_btc.push(market.instrumentType === "Call" ? 1 : 0);
                        strike_btc.push(market.strike);
                        break
                    case "ETH":
                        t_eth.push((market.expiryDate.getTime() - new Date().getTime()) / (60 * 60 * 24 * 365) / 1000);
                        isCall_eth.push(market.instrumentType === "Call" ? 1 : 0);
                        strike_eth.push(market.strike);
                        break
                }
            })

            resolve({
                OptionDelta_btc: option_delta(spot_btc, reshap(strike_btc), iv_btc, r, q, reshap(t_btc), reshap(isCall_btc)),
                OptionDelta_eth: option_delta(spot_eth, reshap(strike_eth), iv_eth, r, q, reshap(t_eth), reshap(isCall_eth))
            });
        }
        catch (err) {
            reject(err);
        }
    })
}