import { initializeContext } from "../../index";
import updateOracle from "../../instructions/authority/authUpdateOracle";
import { Asset as OptifiAsset } from "../../types/optifi-exchange-types";

const assets = [OptifiAsset.Bitcoin, OptifiAsset.Ethereum, OptifiAsset.USDC, OptifiAsset.Solana];

initializeContext().then(async (context) => {
    for (let asset of assets) {
        console.log(asset)
        let res = await updateOracle(context, asset);
        console.log("updateOracle res: ", res)
    }
})