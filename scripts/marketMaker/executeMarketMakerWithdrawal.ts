import { initializeContext } from "../../index";
import executeMarketMakerWithdrawal from "../../instructions/marketMaker/executeMarketMakerWithdrawal";

initializeContext().then(async (context) => {
    executeMarketMakerWithdrawal(context).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})