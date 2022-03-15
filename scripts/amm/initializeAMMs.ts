import { initializeContext } from "../../index";
import { SUPPORTED_ASSETS } from "../../constants";
import Context from "../../types/context";
import { initializeAmm } from "../../instructions/initializeAmm";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";
import { Duration } from "../../types/optifi-exchange-types";
import { USDC_DECIMALS } from "../../lib/constants";

async function initializeAMMOnSupportedAssets(context: Context) {
    let i = 1;
    let duration = Duration.Monthly; // should be the same as created instruments
    let contractSize = 0.01 * (10 ** USDC_DECIMALS); // TBD
    for (let asset of SUPPORTED_ASSETS) {
        console.log("Initializing AMM for asset ", asset);
        try {
            let res = await initializeAmm(context, asset, i, duration, contractSize);
            console.log("Created AMM - ", formatExplorerAddress(context,
                res.data as string,
                SolanaEntityType.Transaction)
            );
            i++;
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    }
}

initializeContext().then((context) => {
    initializeAMMOnSupportedAssets(context)
})