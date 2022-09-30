import { PublicKey } from "@solana/web3.js";
import { PYTH } from "../../constants";
import { initializeContext } from "../../index";
import marketMakerCancelOrder from "../../instructions/marketMaker/marketMakerCancelOrder";
import marketMakerPostOnlyOrder from "../../instructions/marketMaker/marketMakerPostOnlyOrder";
import { OrderSide } from "../../types/optifi-exchange-types";
import { option_price } from "../../utils/calculateMargin";
import { sleep } from "../../utils/generic";
import { getGvolIV } from "../../utils/getGvolIV";
import { findOptifiMarketsWithFullData } from "../../utils/market";
import { getPythData, getSpotPrice } from "../../utils/pyth";

const asset: number = 0;

initializeContext().then(async (context) => {
    let MarketsWithFullDatas = await findOptifiMarketsWithFullData(context);

    console.log(`Found ${MarketsWithFullDatas.length} optifi markets - `);

    let spotRes = await getSpotPrice(context, asset);

    let usdcSpot = await getSpotPrice(context, 2);

    let spot = spotRes / usdcSpot

    for (let MarketsWithFullData of MarketsWithFullDatas) {

        if (MarketsWithFullData.asset == "BTC") {

            // console.log(MarketsWithFullData)

            let [iv, now] = await getGvolIV(asset, MarketsWithFullData.expiryDate.getTime())
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

            console.log(market.toString(), strike, isCall)

            let price = option_price(spot, [[strike]], [[iv]], 0, 0, [[t]], [[isCall]]);

            console.log("price: ", price[0][0], " ,round price: ", Math.round(price * 10000) / 10000)
            await marketMakerCancelOrder(context, market);
            let ask = Math.round(price * 1.005 * 10000) / 10000;
            let bid = Math.round(price * 0.995 * 10000) / 10000;
            if (ask > 0) {
                await marketMakerPostOnlyOrder(context, market, OrderSide.Ask, ask, 10);
            }
            if (bid > 0) {
                await marketMakerPostOnlyOrder(context, market, OrderSide.Bid, bid, 10);
            }
        }
        await sleep(5 * 1000)
    }





    // res = await reloadOptifiMarketsData(context, res)
    // console.log("reloaded data: ", res)
})