import {initializeContext} from "../index";
import {findOptifiMarkets} from "../utils/market";
import {settleSerumFundsIfAnyUnsettled} from "../utils/serum";

initializeContext().then((context) => {
    findOptifiMarkets(context).then(async (markets) => {
        for (let market of markets) {
            console.log("Settling ", market);
            let sigs = await settleSerumFundsIfAnyUnsettled(context, market[1]);
            console.log(sigs);
        }
    })
})