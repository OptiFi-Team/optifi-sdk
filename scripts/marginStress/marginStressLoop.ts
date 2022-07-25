// import { initializeContext } from "../../index";
// import marginStress from "../../instructions/marginStress";
// import marginStressCalculate from "../../instructions/marginStressCalculate";
// // import marginStressSync from "../../instructions/marginStressSync";
// import Asset from "../../types/asset";
// import { MarginStressState } from "../../types/optifi-exchange-types";
// import { findExchangeAccount } from "../../utils/accounts";
// import { assetToOptifiAsset, optifiAssetToNumber, sleep } from "../../utils/generic";
// import { findMarginStressWithAsset } from "../../utils/margin";

// let asset = Asset.Ethereum;

// initializeContext().then(async (context) => {

//     let [exchangeAddress, _] = await findExchangeAccount(context);

//     let optifiAsset = assetToOptifiAsset(asset);

//     let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, optifiAssetToNumber(optifiAsset));


//     const marginLoop = async () => {
//         let marginStressAccount = await context.program.account.marginStressAccount.fetch(marginStressAddress);

//         let state = Object.keys(marginStressAccount.state)[0];
//         let Sync = Object.keys(MarginStressState.Sync)[0];
//         let Calculate = Object.keys(MarginStressState.Calculate)[0];
//         let Available = Object.keys(MarginStressState.Available)[0];

//         console.log("State : ", state);

//         try {
//             let res = await marginStressCalculate(context, asset);
//             console.log("marginStressCalculate: ", res);
//         } catch (e) {
//             await sleep(10000);
//         }
//         marginLoop();
//     }
//     marginLoop();
// })
