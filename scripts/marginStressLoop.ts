import { initializeContext } from "../index";
import marginStressCalculate from "../instructions/marginStressCalculate";
import marginStressSync from "../instructions/marginStressSync";
import Asset from "../types/asset";
import { MarginStressState } from "../types/optifi-exchange-types";
import { findExchangeAccount } from "../utils/accounts";
import { assetToOptifiAsset, optifiAssetToNumber } from "../utils/generic";
import { findMarginStressWithAsset } from "../utils/margin";

let asset = Asset.Bitcoin;

initializeContext().then(async (context) => {

    let [exchangeAddress, _] = await findExchangeAccount(context);

    let optifiAsset = assetToOptifiAsset(asset);

    let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, optifiAssetToNumber(optifiAsset));


    let marginStressAccount = await context.program.account.marginStressAccount.fetch(marginStressAddress);

    let state = Object.keys(marginStressAccount.state)[0];
    let Sync = Object.keys(MarginStressState.Sync)[0];
    let Calculate = Object.keys(MarginStressState.Calculate)[0];
    let Available = Object.keys(MarginStressState.Available)[0];

    while (true) {

        console.log("State : ", state);

        if (state == Sync) {
            let res = await marginStressSync(context, asset);
            console.log("marginStressSync: ", res);

        }
        else if (state == Calculate) {
            let res = await marginStressCalculate(context, asset);
            console.log("marginStressCalculate: ", res);
        }
        else if (state == Available) {
            console.log("Available");
            break;
        }
    }
})
