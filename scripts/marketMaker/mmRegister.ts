import { initializeContext } from "../../index";
import registerMarketMaker from "../../instructions/marketMaker/registerMarketMaker";

initializeContext().then(async (context) => {

    registerMarketMaker(context).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})