import { initializeContext } from "../../index";
import updateOracle from "../../instructions/authority/authUpdateOracle";
import { Asset as OptifiAsset } from "../../types/optifi-exchange-types";

initializeContext().then(async (context) => {
    let res = await updateOracle(context, OptifiAsset.Bitcoin);
    console.log("updateOracle res: ", res)
})