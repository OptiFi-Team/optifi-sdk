import { ndf, d2Call, d2Put, reshap, ndfBid } from "./calculateMargin"
import Context from "../types/context";
import { OptifiMarketFullData } from "./market";
import { getSpotPrice } from "./pyth";
import { getGvolIV } from "./getGvolIV";
import Asset from "../types/asset";

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

async function assetProfitChance(
    optifiMarkets: OptifiMarketFullData[],
    marketData: BreakEvenDataRes,
): Promise<ProfitChanceRes[]> {
    return new Promise(async (resolve, reject) => {
        try {
            let res: ProfitChanceRes[] = [];
            let callFirstAsk: number[] = optifiMarkets.filter(e => e.instrumentType == "Call").map(e => { return e.askPrice })
            let callFirstBid: number[] = optifiMarkets.filter(e => e.instrumentType == "Call").map(e => { return e.bidPrice })
            let putFirstAsk: number[] = optifiMarkets.filter(e => e.instrumentType == "Put").map(e => { return e.askPrice })
            let putFirstBid: number[] = optifiMarkets.filter(e => e.instrumentType == "Put").map(e => { return e.bidPrice })

            let callStrike: number[] = optifiMarkets.filter(e => e.instrumentType == "Call").map(e => { return e.strike })
            let putStrike: number[] = optifiMarkets.filter(e => e.instrumentType == "Put").map(e => { return e.strike })

            let callMarketAddress: string[] = optifiMarkets.filter(e => e.instrumentType == "Call").map(e => { return e.marketAddress.toString() })
            let putMarketAddress: string[] = optifiMarkets.filter(e => e.instrumentType == "Put").map(e => { return e.marketAddress.toString() })

            let callFirstAskArr = reshap(callFirstAsk)
            let callFirstBidArr = reshap(callFirstBid)
            let putFirstAskArr = reshap(putFirstAsk)
            let putFirstBidArr = reshap(putFirstBid)

            let callMarketData = marketData.filter(e => { return e.isCall == 1 })
            let putMarketData = marketData.filter(e => { return e.isCall == 0 })

            let callBreakEvenArr = await calcBreakEven(callMarketData);
            let putBreakEvenArr = await calcBreakEven(putMarketData);

            //prepare t
            let tCallTmp: number[] = [];
            let tPutTmp: number[] = [];

            for (let data of callMarketData) {
                tCallTmp.push(data.t);
            }
            for (let data of putMarketData) {
                tPutTmp.push(data.t);
            }

            let tCall = reshap(tCallTmp);
            let tPut = reshap(tPutTmp);

            let callBreakEvenAskPriceArr = reshap(callBreakEvenArr[0])
            let callBreakEvenBidPriceArr = reshap(callBreakEvenArr[1])
            let putBreakEvenAskPriceArr = reshap(putBreakEvenArr[0])
            let putBreakEvenBidPriceArr = reshap(putBreakEvenArr[1])

            //spot and iv          
            let d2callAskPriceResult = d2Call(marketData[0].spot, callFirstAskArr, marketData[0].iv, r, q, tCall, callStrike)
            let d2callBidPriceResult = d2Call(marketData[0].spot, callFirstBidArr, marketData[0].iv, r, q, tCall, callStrike)
            //*-1 for Put
            let d2putAskPriceResult = d2Put(marketData[0].spot, putFirstAskArr, marketData[0].iv, r, q, tPut, putStrike)
            let d2putBidPriceResult = d2Put(marketData[0].spot, putFirstBidArr, marketData[0].iv, r, q, tPut, putStrike)
            d2putAskPriceResult = d2putAskPriceResult.map(e => { return -1 * e });
            d2putBidPriceResult = d2putBidPriceResult.map(e => { return -1 * e });

            //profit chance
            let ndfCallAskPriceResult = ndf(d2callAskPriceResult);
            let ndfPutAskPriceResult = ndf(d2putAskPriceResult);
            let ndfCallBidPriceResult = ndfBid(d2callBidPriceResult);
            let ndfPutBidPriceResult = ndfBid(d2putBidPriceResult);

            //call
            for (let i = 0; i < ndfCallAskPriceResult.length; i++) {
                let oneRes: ProfitChanceRes = {
                    buy:
                    {
                        breakEven: callBreakEvenBidPriceArr[i][0],
                        profitChance: (callFirstAskArr[i][0] == 0) ? 0 : ndfCallAskPriceResult[i]
                    },
                    sell: {
                        breakEven: callBreakEvenAskPriceArr[i][0],
                        profitChance: (callFirstBidArr[i][0] == 0) ? 0 : ndfCallBidPriceResult[i]
                    },
                    marketAddress: callMarketAddress[i]
                }
                res.push(oneRes)
            }

            //put   
            for (let i = 0; i < ndfPutAskPriceResult.length; i++) {
                let oneRes: ProfitChanceRes = {
                    buy:
                    {
                        breakEven: putBreakEvenBidPriceArr[i][0],
                        profitChance: (putFirstAskArr[i][0] == 0) ? 0 : ndfPutAskPriceResult[i]
                    },
                    sell: {
                        breakEven: putBreakEvenAskPriceArr[i][0],
                        profitChance: (putFirstBidArr[i][0] == 0) ? 0 : ndfPutBidPriceResult[i]
                    },
                    marketAddress: putMarketAddress[i]
                }
                res.push(oneRes)
            }
            resolve(res);
        } catch (err) {
            console.log("err with asset " + marketData[0].asset)
            resolve([])
        }
    })
}


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
            let marketDatas = await getMarketData(context, optifiMarkets)//get spot , iv , r , q , t , strike
            let assets = ["BTC", "ETH", "SOL"]

            for (let asset of assets) {
                let optifiMarket = optifiMarkets.filter(e => { return e.asset == asset });
                let marketData = marketDatas.filter(e => { return e.asset == asset })
                let assetRes = await assetProfitChance(optifiMarket, marketData);
                Array.prototype.push.apply(res, assetRes);
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
            let spotRes_btc = await getSpotPrice(context, Asset.Bitcoin);
            let spotRes_eth = await getSpotPrice(context, Asset.Ethereum);
            let spotRes_sol = await getSpotPrice(context, Asset.Solana);
            // TODO: check the expiryDate
            let [ivRes_btc] = await getGvolIV(Asset.Bitcoin, optifiMarkets[0].expiryDate.getTime())
            let [ivRes_eth] = await getGvolIV(Asset.Ethereum, optifiMarkets[0].expiryDate.getTime())
            let [ivRes_sol] = await getGvolIV(Asset.Solana, optifiMarkets[0].expiryDate.getTime())

            let usdcSpot = await getSpotPrice(context, Asset.USDC);

            let spot_btc = Math.round(spotRes_btc / usdcSpot * 100) / 100
            let spot_eth = Math.round(spotRes_eth / usdcSpot * 100) / 100
            let spot_sol = Math.round(spotRes_sol / usdcSpot * 100) / 100
            let iv_btc = ivRes_btc / 100
            let iv_eth = ivRes_eth / 100
            let iv_sol = ivRes_sol / 100

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
                    case "SOL":
                        spot = spot_sol
                        iv = iv_sol
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
