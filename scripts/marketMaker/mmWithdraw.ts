import { initializeContext } from "../../index";
import marketMakerWithdraw from "../../instructions/marketMaker/marketMakerWithdraw";
import registerMarketMaker from "../../instructions/marketMaker/registerMarketMaker";

initializeContext().then(async (context) => {
    marketMakerWithdraw(context).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})