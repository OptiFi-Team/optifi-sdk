import { initializeContext } from "../../index";
import marketMakerPostOnlyOrder from "../../instructions/marketMaker/marketMakerPostOnlyOrder";
import { OrderSide } from "../../types/optifi-exchange-types";
import { market } from "../constants";

let price = 1000;
let size = 1;
let side = OrderSide.Bid;

initializeContext().then(async (context) => {
    marketMakerPostOnlyOrder(context, market, side, price, size
    ).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})