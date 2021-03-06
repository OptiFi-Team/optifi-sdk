import Context from "../types/context";
import { findOptifiMarkets, OptifiMarketFullData } from "./market"
import { findUserAccount } from "./accounts";
import { OracleDataType } from "../types/optifi-exchange-types";
import { option_delta } from "./calculateMargin";
import { getSpotnIv } from "./calcMarginRequirementForUser";
import { PublicKey } from "@solana/web3.js";
import { parseAggregatorAccountData } from "@switchboard-xyz/switchboard-api"
import { SWITCHBOARD, USDC_DECIMALS } from "../constants";
import { getSwitchboard } from "./switchboardV2";

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
): Promise<number[]> {
    return new Promise(async (resolve, reject) => {
        try {
            let spotRes_btc = await getSwitchboard(context, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD));
            let ivRes_btc = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_IV))

            let spotRes_eth = await getSwitchboard(context, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_USD));
            let ivRes_eth = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_IV))

            let usdcSpot = await getSwitchboard(context, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_USDC_USD))

            let spot_btc = Math.round(spotRes_btc / usdcSpot * 100) / 100
            let spot_eth = Math.round(spotRes_eth / usdcSpot * 100) / 100
            let iv_btc = ivRes_btc.lastRoundResult?.result! / 100
            let iv_eth = ivRes_eth.lastRoundResult?.result! / 100

            let today = new Date().getTime();
            let res = optifiMarket.map(market => {
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

                let t = (market.expiryDate.getTime() / 1000 - today / 1000) / (60 * 60 * 24 * 365);
                let isCall = market.instrumentType === "Call" ? 1 : 0
                let temp = option_delta(spot, reshap([market.strike]), iv, r, q, reshap([t]), reshap([isCall]))
                return temp[0][0]
            })

            resolve(res)
        }
        catch (err) {
            reject(err);
        }
    })
}
