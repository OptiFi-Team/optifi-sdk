import { initializeContextWithoutWallet } from "../index";
import { findOptifiInstruments, findOptifiMarkets, findOptifiMarketsWithFullData } from "../utils/market";


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
        console.log("findOptifiInstrumentsWithOrderbook res: ", res)
    }).catch((err) => {
        console.error(err);
    })

}).catch((err) => {
    console.error(err);
})
