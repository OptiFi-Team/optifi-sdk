import { initializeContext } from "../../index";
import marketMakerCalculation from "../../instructions/marketMaker/marketMakerCalculation";
import { market } from "../constants";

initializeContext().then(async (context) => {
    marketMakerCalculation(context, market,
    ).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})