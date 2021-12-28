import Context from "../types/context";
import createOptifiMarkets from "./createOptifiMarkets";
import Asset from "../types/asset";

/**
 * Create new instruments for an exchange -
 * find any 
 * @param context
 */
export function createInstruments(context: Context) {
    createOptifiMarkets(context).then((res) => {
        for (let asset of [Asset.Ethereum, Asset.Bitcoin]) {
            console.debug("Creating instruments for asset ", asset);
        }
    })
}