import { PublicKey } from "@solana/web3.js";
import { SWITCHBOARD } from "../../constants";
import { initializeContext } from "../../index";
import marketMakerCancelOrder from "../../instructions/marketMaker/marketMakerCancelOrder";
import marketMakerPostOnlyOrder from "../../instructions/marketMaker/marketMakerPostOnlyOrder";
import { OrderSide } from "../../types/optifi-exchange-types";
import { option_price } from "../../utils/calculateMargin";
import { sleep } from "../../utils/generic";
import { findOptifiMarketsWithFullData } from "../../utils/market";
import { getSwitchboard } from "../../utils/switchboardV2";

const usdcSpot = 1;
const asset: number = 0;

initializeContext().then(async (context) => {
    let MarketsWithFullDatas = await findOptifiMarketsWithFullData(context);

    console.log(`Found ${MarketsWithFullDatas.length} optifi markets - `);


    let spotRes: number;
    let ivRes: number;
    switch (asset) {
        case 0:
            spotRes = await getSwitchboard(context, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD))
            ivRes = await getSwitchboard(context, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_IV))
            break
        case 1:
            spotRes = await getSwitchboard(context, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_USD))
            ivRes = await getSwitchboard(context, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_IV))
            break
        default:
            throw Error("unsupported asset type")
    }
    let spot = spotRes / usdcSpot
    let iv = ivRes / 100
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