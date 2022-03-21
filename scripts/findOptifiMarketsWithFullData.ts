import { initializeContext } from "../index";
import { findOptifiInstruments, findOptifiMarketsWithFullData } from "../utils/market";


initializeContext().then((context) => {

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