import { initializeContextWithoutWallet } from "../index";
import { findOptifiInstruments, findOptifiMarkets, findOptifiMarketsWithFullData } from "../utils/market";
import { calculateIV } from "../utils/calculateIV";
import { calculateOptionDelta } from "../utils/calculateOptionDelta";


initializeContextWithoutWallet().then(async (context) => {
    let markets = await findOptifiMarketsWithFullData(context)

    // let iv = await calculateIV(context, markets)
    // console.log('calculateIV function result is ', iv);

    let delta = await calculateOptionDelta(context, markets)
    console.log('calculateOptionDelta function result is ', delta);

}).catch((err) => {
    console.error(err);
})