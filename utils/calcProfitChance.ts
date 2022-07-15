import { ndf, d2Call, d2Put, reshap, ndfBid } from "./calculateMargin"
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
import { getSwitchboard } from "./switchboardV2";

interface ProfitChance {
    breakEven: number,
    profitChance: number
}
interface ProfitChanceRes {
    buy: ProfitChance,
    sell: ProfitChance,
    marketAddress: string,
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
    asset: string,
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

            let BTCOptifiMarkets = optifiMarkets.filter(e => { return e.asset == "BTC" });
            let ETHOptifiMarkets = optifiMarkets.filter(e => { return e.asset == "ETH" });

            let BTCCallFirstAsk: number[] = BTCOptifiMarkets.filter(e => e.instrumentType == "Call").map(e => { return e.askPrice })
            let BTCCallFirstBid: number[] = BTCOptifiMarkets.filter(e => e.instrumentType == "Call").map(e => { return e.bidPrice })
            let BTCPutFirstAsk: number[] = BTCOptifiMarkets.filter(e => e.instrumentType == "Put").map(e => { return e.askPrice })
            let BTCPutFirstBid: number[] = BTCOptifiMarkets.filter(e => e.instrumentType == "Put").map(e => { return e.bidPrice })
            let ETHCallFirstAsk: number[] = ETHOptifiMarkets.filter(e => e.instrumentType == "Call").map(e => { return e.askPrice })
            let ETHCallFirstBid: number[] = ETHOptifiMarkets.filter(e => e.instrumentType == "Call").map(e => { return e.bidPrice })
            let ETHPutFirstAsk: number[] = ETHOptifiMarkets.filter(e => e.instrumentType == "Put").map(e => { return e.askPrice })
            let ETHPutFirstBid: number[] = ETHOptifiMarkets.filter(e => e.instrumentType == "Put").map(e => { return e.bidPrice })

            let BTCCallStrike: number[] = BTCOptifiMarkets.filter(e => e.instrumentType == "Call").map(e => { return e.strike })
            let BTCPutStrike: number[] = BTCOptifiMarkets.filter(e => e.instrumentType == "Put").map(e => { return e.strike })
            let ETHCallStrike: number[] = ETHOptifiMarkets.filter(e => e.instrumentType == "Call").map(e => { return e.strike })
            let ETHPutStrike: number[] = ETHOptifiMarkets.filter(e => e.instrumentType == "Put").map(e => { return e.strike })

            let BTCCallMarketAddress: string[] = BTCOptifiMarkets.filter(e => e.instrumentType == "Call").map(e => { return e.marketAddress.toString() })
            let BTCPutMarketAddress: string[] = BTCOptifiMarkets.filter(e => e.instrumentType == "Put").map(e => { return e.marketAddress.toString() })
            let ETHCallMarketAddress: string[] = ETHOptifiMarkets.filter(e => e.instrumentType == "Call").map(e => { return e.marketAddress.toString() })
            let ETHPutMarketAddress: string[] = ETHOptifiMarkets.filter(e => e.instrumentType == "Put").map(e => { return e.marketAddress.toString() })

            let BTCCallFirstAskArr = reshap(BTCCallFirstAsk)
            let BTCCallFirstBidArr = reshap(BTCCallFirstBid)
            let BTCPutFirstAskArr = reshap(BTCPutFirstAsk)
            let BTCPutFirstBidArr = reshap(BTCPutFirstBid)
            let ETHCallFirstAskArr = reshap(ETHCallFirstAsk)
            let ETHCallFirstBidArr = reshap(ETHCallFirstBid)
            let ETHPutFirstAskArr = reshap(ETHPutFirstAsk)
            let ETHPutFirstBidArr = reshap(ETHPutFirstBid)

            let marketData = await getMarketData(context, optifiMarkets)//get spot , iv , r , q , t , strike, total len is 20

            let BTCmarketData = marketData.filter(e => { return e.asset == "BTC" })
            let ETHmarketData = marketData.filter(e => { return e.asset == "ETH" })

            let BTCCallMarketData = BTCmarketData.filter(e => { return e.isCall == 1 })
            let BTCPutMarketData = BTCmarketData.filter(e => { return e.isCall == 0 })
            let ETHCallMarketData = ETHmarketData.filter(e => { return e.isCall == 1 })
            let ETHPutMarketData = ETHmarketData.filter(e => { return e.isCall == 0 })

            // marketData element:
            // {
            //     spot: 3035.5769939999996,
            //     iv: 0.517,
            //     t: 0.01936258158929181,
            //     isCall: 1,
            //     strike: 3250,
            //     premium: { askPrice: 0, bidPrice: 0 }
            //  }

            let BTCCallBreakEvenArr = await calcBreakEven(BTCCallMarketData);
            let BTCPutBreakEvenArr = await calcBreakEven(BTCPutMarketData);
            let ETHCallBreakEvenArr = await calcBreakEven(ETHCallMarketData);
            let ETHPutBreakEvenArr = await calcBreakEven(ETHPutMarketData);

            //prepare t
            let tBTCCallTmp: number[] = [];
            let tBTCPutTmp: number[] = [];
            let tETHCallTmp: number[] = [];
            let tETHPutTmp: number[] = [];

            for (let data of BTCCallMarketData) {
                tBTCCallTmp.push(data.t);
            }
            for (let data of BTCPutMarketData) {
                tBTCPutTmp.push(data.t);
            }
            for (let data of ETHCallMarketData) {
                tETHCallTmp.push(data.t);
            }
            for (let data of ETHPutMarketData) {
                tETHPutTmp.push(data.t);
            }

            let tBTCCall = reshap(tBTCCallTmp);
            let tBTCPut = reshap(tBTCPutTmp);
            let tETHCall = reshap(tETHCallTmp);
            let tETHPut = reshap(tETHPutTmp);

            let BTCCallBreakEvenAskPriceArr = reshap(BTCCallBreakEvenArr[0])
            let BTCCallBreakEvenBidPriceArr = reshap(BTCCallBreakEvenArr[1])
            let ETHCallBreakEvenAskPriceArr = reshap(ETHCallBreakEvenArr[0])
            let ETHCallBreakEvenBidPriceArr = reshap(ETHCallBreakEvenArr[1])
            let BTCPutBreakEvenAskPriceArr = reshap(BTCPutBreakEvenArr[0])
            let BTCPutBreakEvenBidPriceArr = reshap(BTCPutBreakEvenArr[1])
            let ETHPutBreakEvenAskPriceArr = reshap(ETHPutBreakEvenArr[0])
            let ETHPutBreakEvenBidPriceArr = reshap(ETHPutBreakEvenArr[1])

            // BTCFirstAskArr[0][0] = 7000
            // BTCFirstBidArr[0][0] = 5000
            // tBTCCall[0][0] = 0.03015
            // BTCCallStrike[0] = 15000
            // let d2BTCCallAskPriceResult = d2Call(20644.19, BTCFirstAskArr, 1.18, r, q, tBTCCall, BTCCallStrike)
            // let d2BTCCallBidPriceResult = d2Call(20644.19, BTCFirstBidArr, 1.18, r, q, tBTCCall, BTCCallStrike)

            //spot and iv only btc/eth
            //BTC            
            let d2BTCCallAskPriceResult = d2Call(BTCmarketData[0].spot, BTCCallFirstAskArr, BTCmarketData[0].iv, r, q, tBTCCall, BTCCallStrike)
            let d2BTCCallBidPriceResult = d2Call(BTCmarketData[0].spot, BTCCallFirstBidArr, BTCmarketData[0].iv, r, q, tBTCCall, BTCCallStrike)
            //*-1 for Put
            let d2BTCPutAskPriceResult = d2Put(BTCmarketData[0].spot, BTCPutFirstAskArr, BTCmarketData[0].iv, r, q, tBTCPut, BTCPutStrike)
            let d2BTCPutBidPriceResult = d2Put(BTCmarketData[0].spot, BTCPutFirstBidArr, BTCmarketData[0].iv, r, q, tBTCPut, BTCPutStrike)
            d2BTCPutAskPriceResult = d2BTCPutAskPriceResult.map(e => { return -1 * e });
            d2BTCPutBidPriceResult = d2BTCPutBidPriceResult.map(e => { return -1 * e });

            //ETH
            let d2ETHCallAskPriceResult = d2Call(ETHmarketData[0].spot, ETHCallFirstAskArr, ETHmarketData[0].iv, r, q, tETHCall, ETHCallStrike)
            let d2ETHCallBidPriceResult = d2Call(ETHmarketData[0].spot, ETHCallFirstBidArr, ETHmarketData[0].iv, r, q, tETHCall, ETHCallStrike)
            // *-1 for Put
            let d2ETHPutAskPriceResult = d2Put(ETHmarketData[0].spot, ETHPutFirstAskArr, ETHmarketData[0].iv, r, q, tETHPut, ETHPutStrike)
            let d2ETHPutBidPriceResult = d2Put(ETHmarketData[0].spot, ETHPutFirstBidArr, ETHmarketData[0].iv, r, q, tETHPut, ETHPutStrike)
            d2ETHPutAskPriceResult = d2ETHPutAskPriceResult.map(e => { return -1 * e });
            d2ETHPutBidPriceResult = d2ETHPutBidPriceResult.map(e => { return -1 * e });

            //BTC profit chance
            let ndfBTCCallAskPriceResult = ndf(d2BTCCallAskPriceResult);
            let ndfBTCPutAskPriceResult = ndf(d2BTCPutAskPriceResult);
            let ndfBTCCallBidPriceResult = ndfBid(d2BTCCallBidPriceResult);
            let ndfBTCPutBidPriceResult = ndfBid(d2BTCPutBidPriceResult);

            //ETH profit chance
            let ndfETHCallAskPriceResult = ndf(d2ETHCallAskPriceResult);
            let ndfETHPutAskPriceResult = ndf(d2ETHPutAskPriceResult);
            let ndfETHCallBidPriceResult = ndfBid(d2ETHCallBidPriceResult);
            let ndfETHPutBidPriceResult = ndfBid(d2ETHPutBidPriceResult);

            //BTC Call
            for (let i = 0; i < ndfBTCCallAskPriceResult.length; i++) {
                let oneRes: ProfitChanceRes = {
                    buy:
                    {
                        breakEven: BTCCallBreakEvenBidPriceArr[i][0],
                        profitChance: (BTCCallFirstAskArr[i][0] == 0) ? 0 : ndfBTCCallAskPriceResult[i]
                    },
                    sell: {
                        breakEven: BTCCallBreakEvenAskPriceArr[i][0],
                        profitChance: (BTCCallFirstBidArr[i][0] == 0) ? 0 : ndfBTCCallBidPriceResult[i]
                    },
                    marketAddress: BTCCallMarketAddress[i]
                }
                res.push(oneRes)
            }

            //BTC Put   
            for (let i = 0; i < ndfBTCPutAskPriceResult.length; i++) {
                let oneRes: ProfitChanceRes = {
                    buy:
                    {
                        breakEven: BTCPutBreakEvenBidPriceArr[i][0],
                        profitChance: (BTCPutFirstAskArr[i][0] == 0) ? 0 : ndfBTCPutAskPriceResult[i]
                    },
                    sell: {
                        breakEven: BTCPutBreakEvenAskPriceArr[i][0],
                        profitChance: (BTCPutFirstBidArr[i][0] == 0) ? 0 : ndfBTCPutBidPriceResult[i]
                    },
                    marketAddress: BTCPutMarketAddress[i]
                }
                res.push(oneRes)
            }

            // ETH Call  
            for (let i = 0; i < ndfETHCallAskPriceResult.length; i++) {
                let oneRes: ProfitChanceRes = {
                    buy:
                    {
                        breakEven: ETHCallBreakEvenBidPriceArr[i][0],
                        profitChance: (ETHCallFirstAskArr[i][0] == 0) ? 0 : ndfETHCallAskPriceResult[i]
                    },
                    sell: {
                        breakEven: ETHCallBreakEvenAskPriceArr[i][0],
                        profitChance: (ETHCallFirstBidArr[i][0] == 0) ? 0 : ndfETHCallBidPriceResult[i]
                    },
                    marketAddress: ETHCallMarketAddress[i]
                }
                res.push(oneRes)
            }

            //ETH Put
            for (let i = 0; i < ndfETHPutAskPriceResult.length; i++) {
                let oneRes: ProfitChanceRes = {
                    buy:
                    {
                        breakEven: ETHPutBreakEvenBidPriceArr[i][0],
                        profitChance: (ETHPutFirstAskArr[i][0] == 0) ? 0 : ndfETHPutAskPriceResult[i]
                    },
                    sell: {
                        breakEven: ETHPutBreakEvenAskPriceArr[i][0],
                        profitChance: (ETHPutFirstBidArr[i][0] == 0) ? 0 : ndfETHPutBidPriceResult[i]
                    },
                    marketAddress: ETHPutMarketAddress[i]
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
            let spotRes_btc = await getSwitchboard(context, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD));
            let ivRes_btc = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_IV))

            let spotRes_eth = await getSwitchboard(context, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_USD));
            let ivRes_eth = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_IV))

            let usdcSpot = await getSwitchboard(context, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_USDC_USD))

            // let spot_btc = spotRes_btc.lastRoundResult?.result! / usdcSpot.lastRoundResult?.result!
            // let spot_eth = spotRes_eth.lastRoundResult?.result! / usdcSpot.lastRoundResult?.result!
            let spot_btc = Math.round(spotRes_btc / usdcSpot * 100) / 100
            let spot_eth = Math.round(spotRes_eth / usdcSpot * 100) / 100
            let iv_btc = ivRes_btc.lastRoundResult?.result! / 100
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
                    premium: premium,
                    asset: market.asset,
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