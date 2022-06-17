import Context from "../types/context";
import { TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";

import Asset from "../types/asset";
import { findMarginStressWithAsset } from "../utils/margin";
import { findExchangeAccount } from "../utils/accounts";
import { assetToOptifiAsset, optifiAssetToNumber } from "../utils/generic";
import { increaseComputeUnitsIx } from "../utils/transactions";

export default function marginStressCalculate(context: Context,
    asset: Asset
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {

        let [exchangeAddress, _] = await findExchangeAccount(context);

        let optifiAsset = assetToOptifiAsset(asset);

        let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, optifiAssetToNumber(optifiAsset));

        context.program.rpc.marginStressCalculate(
            {
                accounts: {
                    optifiExchange: exchangeAddress,
                    marginStressAccount: marginStressAddress,
                },
                preInstructions: [increaseComputeUnitsIx]
            }
        ).then((res) => {
            resolve({
                successful: true,
                data: res as TransactionSignature
            })
        }).catch((err) => reject(err))
    })
}