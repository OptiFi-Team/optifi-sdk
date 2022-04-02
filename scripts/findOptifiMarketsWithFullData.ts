import { initializeContextWithoutWallet } from "../index";
import { findOptifiInstruments, findOptifiMarkets, findOptifiMarketsWithFullData } from "../utils/market";
import { calculateIV } from "../utils/calculateIV";
import { calculateOptionDelta } from "../utils/calculateOptionDelta";


initializeContextWithoutWallet().then((context) => {

    // findOptifiMarkets(context).then(res => {ß
    //     console.log("findOptifiMarkets res: ", res)
    // }).catch((err) => {
    //     console.error(err);
    // })

    // findOptifiInstruments(context).then(res => {
    //     console.log("findOptifiInstruments res: ", res)
    // }).catch((err) => {
    //     console.error(err);
    // })

    findOptifiMarketsWithFullData(context).then(res => {
        // console.log("findOptifiInstrumentsWithOrderbook res: ", res)
        console.log("calculateIV function: ", calculateIV(context, res))
        // console.log("calculateOptionDelta function: ", calculateOptionDelta(context, res))
        // let test = calculateOptionDelta(context, res);
        // test.then(function(result) {
        //     console.log('testing result is ', result)
        // })

    }).catch((err) => {
        console.error(err);
    })

}).catch((err) => {
    console.error(err);
})