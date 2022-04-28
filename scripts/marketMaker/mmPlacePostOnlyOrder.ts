import { initializeContext } from "../../index";
import marketMakerPostOnlyOrder from "../../instructions/marketMaker/marketMakerPostOnlyOrder";
import marketMakerWithdraw from "../../instructions/marketMaker/marketMakerWithdraw";
import registerMarketMaker from "../../instructions/marketMaker/registerMarketMaker";
import { OrderSide } from "../../types/optifi-exchange-types";
import OrderType from "../../types/OrderType";
import { market } from "../constants";

let price = 1000;
let size = 1;
let side = OrderSide.Bid;
let orderType = OrderType.PostOnly;

initializeContext().then(async (context) => {
    marketMakerPostOnlyOrder(context, market, side, price, size
    ).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})