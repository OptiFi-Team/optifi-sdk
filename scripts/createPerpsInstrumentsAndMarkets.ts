// @ts-ignore
import { initializeContext } from "../index";
import Context from "../types/context";
import { createPerpsInstrumentsAndMarkets } from "../sequences/createPerpsInstrumentsAndMarkets";

initializeContext().then((context: Context) => {
    console.log("Initialized")
    createPerpsInstrumentsAndMarkets(context).then((res) => {
        console.log("res.length")
        console.log(res.length)
        console.log("created instruments")
    }).catch((err) => {
        console.error(err);
        console.error("Got error in createPerpsInstruments");
    })
}).catch((err) => {
    console.error(err);
    console.error("Got error in initializeContext");
})