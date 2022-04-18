
import { initializeContext } from "../index";
import { calcProfitChance } from "../utils/calcProfitChance"
import { findOptifiMarketsWithFullData } from "../utils/market";

initializeContext().then(async (context) => {
    let markets = await findOptifiMarketsWithFullData(context)
    let res = await calcProfitChance(context, markets);
    // output:
    // {
    //     buy: { breakEven: 38000, profitChance: 0.2049245563591508 },
    //     sell: { breakEven: 38000, profitChance: 0.2049245563591508 }
    // },
    console.log(res)
})