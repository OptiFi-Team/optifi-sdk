import { initializeContextWithoutWallet } from "../index";
import { findOptifiMarketsWithFullData } from "../utils/market";
import { calculateOptionGamma, calculateOptionVega } from "../utils/calculateOptionDelta";


initializeContextWithoutWallet().then(async (context) => {
    let markets = await findOptifiMarketsWithFullData(context)
    let gamma = await calculateOptionGamma(context, markets)
    console.log('calculateOptionGamma function result is ', gamma);

    let vega = await calculateOptionVega(context, markets)
    console.log('calculateOptionVega function result is ', vega);

}).catch((err) => {
    console.error(err);
})