import { ndf, d2, reshap } from "./calculateMargin"
import { STRIKE, PREMIUM, IS_CALL, TIME_TO_MATURITY } from "./calcMarginTestData"
import Context from "../types/context";
import { parseAggregatorAccountData } from "@switchboard-xyz/switchboard-api"
import { SWITCHBOARD, USDC_DECIMALS } from "../constants";
import { PublicKey } from "@solana/web3.js";
import { OptifiMarketFullData, Position } from "./market";
import { option_delta } from "./calculateMargin";
import { resolve } from "path";
import { rejects } from "assert";
import { table } from "console";

interface ProfitChance {
    breakEven: number,
    profitChance: number
}
interface ProfitChanceRes {
    buy: ProfitChance,
    sell: ProfitChance,
}
interface Premiumtype {
    askPrice: number,
    bidPrice: number,
}
interface BreakEvenDataSingleRes {
    spot: number,
    iv: number,
    t: number,
    isCall: number,
    strike: number,
    premium: Premiumtype,
}
interface BreakEvenDataRes extends Array<BreakEvenDataSingleRes> { }
export const r = 0;
export const q = 0;
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
export async function calcProfitChance(
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
            let res: ProfitChanceRes[] = [];
            let marketLen = optifiMarkets.length;

            let marketData = await getMarketData(context, optifiMarkets)//get spot , iv , r , q , t , strike, total len is 20
            let BTCmarketData = marketData.slice(0, marketLen / 2);
            let ETHmarketData = marketData.slice(marketLen / 2, marketLen);
            // marketData element:
            // {
            //     spot: 3035.5769939999996,
            //     iv: 0.517,
            //     t: 0.01936258158929181,
            //     isCall: 1,
            //     strike: 3250,
            //     premium: { askPrice: 0, bidPrice: 0 }
            //  }

            //breakEvenArr[0]: askPrice break even , len 10
            //breakEvenArr[1]: bidPrice break even , len 10
            //if askPrice is equal to bidPrice , two array should be equal
            let BTCbreakEvenArr = await calcBreakEven(BTCmarketData);
            let ETHbreakEvenArr = await calcBreakEven(ETHmarketData);

            //prepare t
            let tBTCTmp: number[] = [];
            let tETHTmp: number[] = [];

            for (let data of BTCmarketData) {
                tBTCTmp.push(data.t);
            }
            for (let data of ETHmarketData) {
                tETHTmp.push(data.t);
            }

            let tBTC = reshap(tBTCTmp);
            let tETH = reshap(tETHTmp);
  
            let BTCbreakEvenAskPriceArr = reshap(BTCbreakEvenArr[0])
            let BTCbreakEvenBidPriceArr = reshap(BTCbreakEvenArr[1])
            let ETHbreakEvenAskPriceArr = reshap(ETHbreakEvenArr[0])
            let ETHbreakEvenBidPriceArr = reshap(ETHbreakEvenArr[1])

            //spot and iv only btc/eth
            //BTC
            let d2BTCAskPriceResult = d2(marketData[0].spot, BTCbreakEvenAskPriceArr, marketData[0].iv, r, q, tBTC)
            let d2BTCBidPriceResult = d2(marketData[0].spot, BTCbreakEvenBidPriceArr, marketData[0].iv, r, q, tBTC)
            //ETH
            let d2ETHAskPriceResult = d2(marketData[marketLen / 2].spot, ETHbreakEvenAskPriceArr, marketData[marketLen / 2].iv, r, q, tETH)
            let d2ETHBidPriceResult = d2(marketData[marketLen / 2].spot, ETHbreakEvenBidPriceArr, marketData[marketLen / 2].iv, r, q, tETH)

            //BTC profit chance
            let ndfBTCAskPriceResult = ndf(d2BTCAskPriceResult);
            let ndfBTCBidPriceResult = ndf(d2BTCBidPriceResult);
            //ETH profit chance
            let ndfETHAskPriceResult = ndf(d2ETHAskPriceResult);
            let ndfETHBidPriceResult = ndf(d2ETHBidPriceResult);

            // BTC
            for (let i = 0; i < marketLen / 2; i++) {
                let oneRes: ProfitChanceRes = {
                    buy:
                    {
                        breakEven: BTCbreakEvenBidPriceArr[i][0],
                        profitChance: ndfBTCBidPriceResult[i]
                    },
                    sell: {
                        breakEven: BTCbreakEvenAskPriceArr[i][0],
                        profitChance: ndfBTCAskPriceResult[i]
                    }
                }

                res.push(oneRes)
            }
            // ETH
            for (let i = 0; i < marketLen / 2; i++) {
                let oneRes: ProfitChanceRes = {
                    buy:
                    {
                        breakEven: ETHbreakEvenBidPriceArr[i][0],
                        profitChance: ndfETHBidPriceResult[i]
                    },
                    sell: {
                        breakEven: ETHbreakEvenAskPriceArr[i][0],
                        profitChance: ndfETHAskPriceResult[i]
                    }
                }
                res.push(oneRes)
            }


            resolve(res);
        } catch (err) {
            reject(err)
        }
    })
}

function getMarketData(
    context: Context,
    optifiMarkets: OptifiMarketFullData[]
): Promise<BreakEvenDataRes> {
    return new Promise(async (resolve, rejects) => {
        try {
            let spotRes_btc = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD));
            let ivRes_btc = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_IV))

            let spotRes_eth = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_USD));
            let ivRes_eth = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_IV))

            let usdcSpot = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_USDC_USD))

            let spot_btc = spotRes_btc.lastRoundResult?.result! / usdcSpot.lastRoundResult?.result!
            let iv_btc = ivRes_btc.lastRoundResult?.result! / 100
            let spot_eth = spotRes_eth.lastRoundResult?.result! / usdcSpot.lastRoundResult?.result!
            let iv_eth = ivRes_eth.lastRoundResult?.result! / 100

            let today = new Date().getTime();
            let res: BreakEvenDataRes = optifiMarkets.map(market => {

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
                let t: number = (market.expiryDate.getTime() / 1000 - today / 1000) / (60 * 60 * 24 * 365);
                let isCall: number = market.instrumentType === "Call" ? 1 : 0;
                let strike: number = market.strike;
                let premium: Premiumtype = {
                    askPrice: market.askPrice,
                    bidPrice: market.bidPrice,
                }
                return {
                    spot: spot,
                    iv: iv,
                    t: t,
                    isCall: isCall,
                    strike: strike,
                    premium: premium
                }
            })

            resolve(res)
        } catch (err) {
            rejects(err)
        }
    })
}

function calcBreakEven(
    break_even_data: BreakEvenDataRes
): Promise<Array<Array<number>>> {
    return new Promise(async (resolve, rejects) => {
        try {
            let len = break_even_data.length;
            let res = new Array<Array<number>>()
            let sign: number;

            for (let len = 0; len < 2; len++) {
                res.push([]);
            }

            for (let i = 0; i < len; i++) {
                sign = (break_even_data[i].isCall == 1) ? 1 : -1;
                //askPrice break even
                res[0].push(break_even_data[i].strike + sign * break_even_data[i].premium.askPrice);
                //bidPrice break even
                res[1].push(break_even_data[i].strike + sign * break_even_data[i].premium.bidPrice);
            }
            resolve(res);
        } catch (err) {
            rejects(err);
        }
    })
}
