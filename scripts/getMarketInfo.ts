import { initializeContext } from "../index";
import { OptifiMarket, OrderSide } from "../types/optifi-exchange-types";
import { market } from "./constants";

initializeContext().then((context) => {
    context.program.account.optifiMarket.fetch(market).then((marketRes) => {
        let oMarket = marketRes as OptifiMarket;
        console.log("Long is ", oMarket.instrumentLongSplToken.toString(), "short is", oMarket.instrumentShortSplToken.toString())
    })
});