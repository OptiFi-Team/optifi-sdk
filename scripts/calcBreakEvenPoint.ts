import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../index";
import { calcBreakEvenPoint } from "../utils/calcBreakEvenPoint";
import { findOptifiMarketsWithFullData } from "../utils/market";
import { OrderSide } from "../types/optifi-exchange-types";

initializeContext().then(async (context) => {
    try {
        let markets = await findOptifiMarketsWithFullData(context)
        let marketAddress = new PublicKey("2Eu7qRY4oZWAAM3tz2NWBfgogJvM1gHxoYjxFiNbNHb3");
        let side = OrderSide.Ask
        let price = 1234
        let res = await calcBreakEvenPoint(context, markets, side, marketAddress, price);
        console.log(res);
    } catch (err) {
        console.log(err);
    }
});
