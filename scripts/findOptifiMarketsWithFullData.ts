import { initializeContextWithoutWallet } from "../index";
import { findOptifiInstruments, findOptifiMarkets, findOptifiMarketsWithFullData } from "../utils/market";
import { calculateIV } from "../utils/calculateIV"

initializeContextWithoutWallet().then((context) => {

    // findOptifiMarkets(context).then(res => {
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
        console.log("calculateIV res: ", calculateIV(context, res))
    }).catch((err) => {
        console.error(err);
    })


}).catch((err) => {
    console.error(err);
})
