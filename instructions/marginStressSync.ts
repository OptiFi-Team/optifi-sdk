// import Context from "../types/context";
// import { SYSVAR_CLOCK_PUBKEY, TransactionSignature } from "@solana/web3.js";
// import InstructionResult from "../types/instructionResult";

// import Asset from "../types/asset";
// import { findMarginStressWithAsset } from "../utils/margin";
// import { findExchangeAccount, findOracleAccountFromAsset, OracleAccountType } from "../utils/accounts";
// import { assetToOptifiAsset, numberToOptifiAsset, optifiAssetToNumber } from "../utils/generic";
// import {
//     Asset as OptifiAsset,
// } from '../types/optifi-exchange-types';


// export default function marginStressSync(context: Context,
//     asset: Asset
// ): Promise<InstructionResult<TransactionSignature>> {
//     return new Promise(async (resolve, reject) => {

//         let [exchangeAddress, _] = await findExchangeAccount(context);

//         let optifiAsset = assetToOptifiAsset(asset);

//         let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, optifiAssetToNumber(optifiAsset));

//         let spotOracle =
//             await findOracleAccountFromAsset(
//                 context,
//                 numberToOptifiAsset(
//                     asset
//                 )
//             );
//         let ivOracle =
//             await findOracleAccountFromAsset(
//                 context,
//                 numberToOptifiAsset(
//                     asset
//                 ),
//                 OracleAccountType.Iv
//             );
//         let usdcSpotOracle =
//             await findOracleAccountFromAsset(
//                 context,
//                 OptifiAsset.USDC,
//                 OracleAccountType.Spot
//             );

//         // console.log("spotOracle: ", spotOracle.toString());
//         // console.log("ivOracle: ", ivOracle.toString());
//         // console.log("usdcSpotOracle: ", usdcSpotOracle.toString());
//         context.program.rpc.marginStressSync(
//             {
//                 accounts: {
//                     optifiExchange: exchangeAddress,
//                     marginStressAccount: marginStressAddress,
//                     assetFeed: spotOracle,
//                     usdcFeed: usdcSpotOracle,
//                     ivFeed: ivOracle,
//                     clock: SYSVAR_CLOCK_PUBKEY
//                 },
//             }
//         ).then((res) => {
//             resolve({
//                 successful: true,
//                 data: res as TransactionSignature
//             })
//         }).catch((err) => reject(err))
//     })
// }