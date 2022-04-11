
import { initializeContext } from "../index";
import { calcProfitChance } from "../utils/calcProfitChance"
import { findOptifiMarketsWithFullData } from "../utils/market";

// initializeContext().then((context) => {
//     let spot = 40000;
//     let iv = 0.6;
//     let r = 0;
//     let q = 0;

//     calcNDF(context, spot, iv, r, q);
// })

initializeContext().then(async (context) => {
    let markets = await findOptifiMarketsWithFullData(context)

    let res = calcProfitChance(context, markets);
    console.log(res)
})