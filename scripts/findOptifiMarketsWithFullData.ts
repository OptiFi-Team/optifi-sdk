import { initializeContextWithoutWallet } from "../index";
import { findOptifiInstruments, findOptifiMarkets, findOptifiMarketsWithFullData, reloadOptifiMarketsData } from "../utils/market";
import { calculateIV } from "../utils/calculateIV"

initializeContextWithoutWallet().then(async (context) => {

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

    let res = await findOptifiMarketsWithFullData(context)
    console.log("findOptifiMarketsWithFullData res: ", res)

    res = await reloadOptifiMarketsData(context, res)
    console.log("reloaded data: ", res)

})