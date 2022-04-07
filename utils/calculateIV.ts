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
    IV_call_bid_btc: number | number[],
    IV_call_ask_btc: number | number[],
    IV_put_bid_btc: number | number[],
    IV_put_ask_btc: number | number[],
    IV_call_bid_eth: number | number[],
    IV_call_ask_eth: number | number[],
    IV_put_bid_eth: number | number[],
    IV_put_ask_eth: number | number[]
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
): Promise<IVResult> {
    return new Promise(async (resolve, reject) => {
        try {
            // get Spot price too just like optionDeltafunction
            let tCall_btc: number[] = [];
            let tCall_btc1: number[] = [];
            let tCall_eth: number[] = [];
            let tCall_eth1: number[] = [];
            let tPut_btc: number[] = [];
            let tPut_btc1: number[] = [];
            let tPut_eth: number[] = [];
            let tPut_eth1: number[] = [];
            let strikeCall_btc: number[] = [];
            let strikeCall_btc1: number[] = [];
            let strikeCall_eth: number[] = [];
            let strikeCall_eth1: number[] = [];
            let strikePut_btc: number[] = [];
            let strikePut_btc1: number[] = [];
            let strikePut_eth: number[] = [];
            let strikePut_eth1: number[] = [];
            let bidpriceCall_btc: number[] = [];
            let bidpriceCall_eth: number[] = [];
            let askpriceCall_btc: number[] = [];
            let askpriceCall_eth: number[] = [];
            let bidpricePut_btc: number[] = [];
            let bidpricePut_eth: number[] = [];
            let askpricePut_btc: number[] = [];
            let askpricePut_eth: number[] = [];
            let today = new Date().getTime();

            let spotRes_btc = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD))
            spotRes_btc = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD))

            let spotRes_eth = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_USD))
            spotRes_eth = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_USD))

            let usdcSpot = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_USDC_USD))

            let spot_btc = spotRes_btc.lastRoundResult?.result! / usdcSpot.lastRoundResult?.result!
            let spot_eth = spotRes_eth.lastRoundResult?.result! / usdcSpot.lastRoundResult?.result!


            optifiMarket.map(async (market) => {
                switch(market.asset) {
                    case "BTC":
                        if(market.instrumentType === "Call") {
                            // @ts-ignore
                            // let t = ((market.expiryDate.getTime() - new Date().getTime())/ (60 * 60 * 24 * 365)) / 1000;
                            // let strike = market.strike;
                            // let price = (market.bidPrice ? market.askPrice : market.bidPrice);
                            // ivResult.push(imp_vol_call(spot, strike, price, r, q, t))
                            tCall_btc.push(((market.expiryDate.getTime() - today)/ (60 * 60 * 24 * 365)) / 1000);
                            tCall_btc1.push(((market.expiryDate.getTime() - today)/ (60 * 60 * 24 * 365)) / 1000);
                            strikeCall_btc.push(market.strike);
                            strikeCall_btc1.push(market.strike);
        
                            // each market has both ask and bid price
                            // separate btc or eth
        
                            bidpriceCall_btc.push(market.bidPrice);
                            askpriceCall_btc.push(market.askPrice);
                        }
                        else {
                            // @ts-ignore
                            tPut_btc.push(((market.expiryDate.getTime() - today)/ (60 * 60 * 24 * 365)) / 1000);
                            tPut_btc1.push(((market.expiryDate.getTime() - today)/ (60 * 60 * 24 * 365)) / 1000);
                            strikePut_btc.push(market.strike);
                            strikePut_btc1.push(market.strike);
        
                            bidpricePut_btc.push(market.bidPrice);
                            askpricePut_btc.push(market.askPrice);
                        }
                        break
                    case "ETH":
                        if(market.instrumentType === "Call") {
                            // @ts-ignore
                            // let t = ((market.expiryDate.getTime() - new Date().getTime())/ (60 * 60 * 24 * 365)) / 1000;
                            // let strike = market.strike;
                            // let price = (market.bidPrice ? market.askPrice : market.bidPrice);
                            // ivResult.push(imp_vol_call(spot, strike, price, r, q, t))
                            tCall_eth.push(((market.expiryDate.getTime() - today)/ (60 * 60 * 24 * 365)) / 1000);
                            tCall_eth1.push(((market.expiryDate.getTime() - today)/ (60 * 60 * 24 * 365)) / 1000);
                            strikeCall_eth.push(market.strike);
                            strikeCall_eth1.push(market.strike);
        
                            // each market has both ask and bid price
                            // separate btc or eth
        
                            bidpriceCall_eth.push(market.bidPrice);
                            askpriceCall_eth.push(market.askPrice);
                        }
                        else {
                            // @ts-ignore
                            tPut_eth.push(((market.expiryDate.getTime() - today)/ (60 * 60 * 24 * 365)) / 1000);
                            tPut_eth1.push(((market.expiryDate.getTime() - today)/ (60 * 60 * 24 * 365)) / 1000);
                            strikePut_eth.push(market.strike);
                            strikePut_eth1.push(market.strike);
        
                            bidpricePut_eth.push(market.bidPrice);
                            askpricePut_eth.push(market.askPrice);
                        }
                        break
                }
            })

            resolve({
                IV_call_bid_btc: imp_vol_call(spot_btc, reshap(strikeCall_btc), reshap(bidpriceCall_btc), r, q, reshap(tCall_btc)),
                IV_call_ask_btc: imp_vol_call(spot_btc, reshap(strikeCall_btc1), reshap(askpriceCall_btc), r, q, reshap(tCall_btc1)),
                IV_put_bid_btc: imp_vol_put(spot_btc, reshap(strikePut_btc), reshap(bidpricePut_btc), r, q, reshap(tPut_btc)),
                IV_put_ask_btc: imp_vol_put(spot_btc, reshap(strikePut_btc1), reshap(askpricePut_btc), r, q, reshap(tPut_btc1)),
                IV_call_bid_eth: imp_vol_call(spot_eth, reshap(strikeCall_eth), reshap(bidpriceCall_eth), r, q, reshap(tCall_eth)),
                IV_call_ask_eth: imp_vol_call(spot_eth, reshap(strikeCall_eth1), reshap(askpriceCall_eth), r, q, reshap(tCall_eth1)),
                IV_put_bid_eth: imp_vol_put(spot_eth, reshap(strikePut_eth), reshap(bidpricePut_eth), r, q, reshap(tPut_eth)),
                IV_put_ask_eth: imp_vol_put(spot_eth, reshap(strikePut_eth1), reshap(askpricePut_eth), r, q, reshap(tPut_eth1)),
            })
        }
        catch (err) {
            reject(err);
        }
    })    
}