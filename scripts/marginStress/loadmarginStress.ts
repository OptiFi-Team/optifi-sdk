import { initializeContext } from "../../index";
import marginStressInit from "../../instructions/marginStressInit";
import Asset from "../../types/asset";
import { findExchangeAccount } from "../../utils/accounts";
import { assetToOptifiAsset, optifiAssetToNumber } from "../../utils/generic";
import { findMarginStressWithAsset } from "../../utils/margin";

let asset = Asset.Bitcoin;

initializeContext().then(async (context) => {
    let [exchangeAddress, _] = await findExchangeAccount(context);

    let optifiAsset = assetToOptifiAsset(asset);

    let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, optifiAssetToNumber(optifiAsset));
    let marginStressAccount = await context.program.account.marginStressAccount.fetch(marginStressAddress)
    console.log("marginStressAccount info: ", marginStressAccount.state,marginStressAccount.flags )

})