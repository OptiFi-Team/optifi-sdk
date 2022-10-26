// @ts-ignore
import { initializeContext } from "../index";
import Context from "../types/context";
import { createPerpsInstrumentsAndMarkets } from "../instructions/createOptifiPerpsMarket";
import { SUPPORTED_ASSETS } from "../constants";
initializeContext().then(async (context: Context) => {
    for (let asset of SUPPORTED_ASSETS) {
        await createPerpsInstrumentsAndMarkets(context, asset).then((res) => {
            console.log(res)
        }).catch((err) => {
            console.error(err);
            console.error("Got error in createPerpsInstrumentsAndMarkets");
        })
    }
})