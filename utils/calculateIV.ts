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
    ask: number,
    bid: number
}

function reshap(arr: number[]) {

    const newArr: number[][] = [];
    let arr_mod = arr;
    while (arr_mod.length) newArr.push(arr_mod.splice(0, 1));
    return newArr
}

export function calculateIV(
    context: Context,
    optifiMarket: OptifiMarketFullData[]
): Promise<IVResult[]> {
    return new Promise(async (resolve, reject) => {
        try {
            // get Spot price too just like optionDeltafunction
            let spotRes_btc = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD))
            spotRes_btc = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD))

            let spotRes_eth = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_USD))
            spotRes_eth = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_USD))

            let usdcSpot = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_USDC_USD))

            let spot_btc = spotRes_btc.lastRoundResult?.result! / usdcSpot.lastRoundResult?.result!
            let spot_eth = spotRes_eth.lastRoundResult?.result! / usdcSpot.lastRoundResult?.result!

            let today = new Date().getTime();

            let res = optifiMarket.map(market => {
                let spot: number;
                switch (market.asset) {
                    case "BTC":
                        spot = spot_btc
                        break
                    case "ETH":
                        spot = spot_eth
                        break
                }

                let t = (market.expiryDate.getTime() / 1000 - today / 1000) / (60 * 60 * 24 * 365);
                let ivBid: number | number[];
                let ivAsk: number | number[];
                let isCall = market.instrumentType === "Call" ? 1 : 0
                if (isCall) {
                    ivBid = imp_vol_call(spot, reshap([market.strike]), reshap([market.bidPrice]), r, q, reshap([t]))
                    ivAsk = imp_vol_call(spot, reshap([market.strike]), reshap([market.askPrice]), r, q, reshap([t]))
                } else {
                    ivBid = imp_vol_put(spot, reshap([market.strike]), reshap([market.bidPrice]), r, q, reshap([t]))
                    ivAsk = imp_vol_put(spot, reshap([market.strike]), reshap([market.askPrice]), r, q, reshap([t]))
                }

                let temp: IVResult = {
                    ask: ivAsk[0],
                    bid: ivBid[0]
                }
                return temp
            })

            resolve(res)

        }
        catch (err) {
            reject(err);
        }
    })
}