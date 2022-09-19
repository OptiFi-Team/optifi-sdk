import { SUPPORTED_ASSETS } from "../../constants";
import { initializeContext } from "../../index";
import updateOracle from "../../instructions/authority/authUpdateOracle";
import { assetToOptifiAsset } from "../../utils/generic";


initializeContext().then(async (context) => {
    for (let asset of SUPPORTED_ASSETS) {
        console.log(asset)
        let res = await updateOracle(context, assetToOptifiAsset(asset));
        console.log("updateOracle res: ", res)
    }
})