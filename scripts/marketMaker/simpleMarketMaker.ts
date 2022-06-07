import { PublicKey } from "@solana/web3.js";
import { AggregatorState, parseAggregatorAccountData } from "@switchboard-xyz/switchboard-api";
import { SWITCHBOARD } from "../../constants";
import { initializeContext } from "../../index";
import marketMakerCalculation from "../../instructions/marketMaker/marketMakerCalculation";
import marketMakerCancelOrder from "../../instructions/marketMaker/marketMakerCancelOrder";
import marketMakerPostOnlyOrder from "../../instructions/marketMaker/marketMakerPostOnlyOrder";
import { OrderSide } from "../../types/optifi-exchange-types";
import { option_price } from "../../utils/calculateMargin";
import { formatExplorerAddress } from "../../utils/debug";
import { numberAssetToDecimal, sleep } from "../../utils/generic";
import { findOptifiMarkets, findOptifiMarketsWithFullData, reloadOptifiMarketsData } from "../../utils/market";
import { getSerumMarketPrice } from "../../utils/serum";

const usdcSpot = 1;
const asset: number = 0;

initializeContext().then(async (context) => {
    let MarketsWithFullDatas = await findOptifiMarketsWithFullData(context);

    console.log(`Found ${MarketsWithFullDatas.length} optifi markets - `);


    let spotRes: AggregatorState;
    let ivRes: AggregatorState;
    switch (asset) {
        case 0:
            spotRes = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD))
            ivRes = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_IV))
            break
        case 1:
            spotRes = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_USD))
            ivRes = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_IV))
            break
        default:
            throw Error("unsupported asset type")
    }
    let spot = spotRes.lastRoundResult?.result! / usdcSpot
    let iv = ivRes.lastRoundResult?.result! / 100
    console.log("spot price: ", spot, " iv: ", iv)

    for (let MarketsWithFullData of MarketsWithFullDatas) {

        if (MarketsWithFullData.asset == "BTC") {

            // console.log(MarketsWithFullData)

            let market = MarketsWithFullData.marketAddress;
            let strike = MarketsWithFullData.strike;
            let t = (MarketsWithFullData.expiryDate.getTime() - new Date().getTime()) / 1000 / (60 * 60 * 24 * 365)
            let isCall: number;
            console.log(MarketsWithFullData.instrumentType)
            switch (MarketsWithFullData.instrumentType) {
                case "Call":
                    isCall = 1
                    break
                case "Put":
                    isCall = 0
                    break
            }

            console.log(spot, strike, iv, 0, 0, t, isCall)

            let price = option_price(spot, [[strike]], [[iv]], 0, 0, [[t]], [[isCall]]);

            console.log(Math.round(price * 100) / 100)
            await marketMakerCancelOrder(context, market);
            await marketMakerPostOnlyOrder(context, market, OrderSide.Ask, Math.round(price * 1.005 * 100) / 100, 10);
            await marketMakerPostOnlyOrder(context, market, OrderSide.Bid, Math.round(price * 0.995 * 100) / 100, 10);
        }
        await sleep(5 * 1000)
    }





    // res = await reloadOptifiMarketsData(context, res)
    // console.log("reloaded data: ", res)
})