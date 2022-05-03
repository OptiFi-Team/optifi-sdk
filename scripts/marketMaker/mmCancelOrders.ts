import { initializeContext } from "../../index";
import marketMakerCancelOrder from "../../instructions/marketMaker/marketMakerCancelOrder";
import { market } from "../constants";

initializeContext().then(async (context) => {
    marketMakerCancelOrder(context, market).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})