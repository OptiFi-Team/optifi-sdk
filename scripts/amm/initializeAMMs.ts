import { initializeContext } from "../../index";
import { SUPPORTED_ASSETS } from "../../constants";
import Context from "../../types/context";
import { initializeAmm } from "../../instructions/initializeAmm";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";
import { Duration } from "../../types/optifi-exchange-types";
import { USDC_DECIMALS } from "../../constants";
import Asset from "../../types/asset";


let i = 3;
let asset = Asset.Solana;
let duration = Duration.Weekly; // should be the same as created instruments


async function initializeAMMOnSupportedAssets(context: Context) {
    // let contractSize = 0.01 * (10 ** USDC_DECIMALS); // TBD
    let contractSize = 0.01 * (10 ** 4); // TBD
    let res = await initializeAmm(context, asset, i, duration, contractSize);
    console.log("Created AMM - ", formatExplorerAddress(context,
        res.data as string,
        SolanaEntityType.Transaction)
    );
}

initializeContext().then((context) => {
    initializeAMMOnSupportedAssets(context)
})