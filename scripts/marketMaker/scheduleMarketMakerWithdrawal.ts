import { initializeContext } from "../../index";
import scheduleMarketMakerWithdrawal from "../../instructions/marketMaker/scheduleMarketMakerWithdrawal";

let amount = 1000;

initializeContext().then(async (context) => {
    scheduleMarketMakerWithdrawal(context, amount).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})