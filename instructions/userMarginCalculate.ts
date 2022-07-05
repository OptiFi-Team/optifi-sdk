import Context from "../types/context";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";

import { findMarginStressWithAsset } from "../utils/margin";
import { findExchangeAccount, findUserAccount } from "../utils/accounts";
import { assetToOptifiAsset, optifiAssetToNumber } from "../utils/generic";
import { SUPPORTED_ASSETS } from "../constants";
import marginStress from "./marginStress";
import { increaseComputeUnitsIx } from "../utils/transactions";


export default async function userMarginCalculate(context: Context
): Promise<InstructionResult<TransactionSignature>> {

    let [userAccount, _bump2] = await findUserAccount(context);

    return marginCalculate(context, userAccount)

    // for (let asset of SUPPORTED_ASSETS) {

    //     let optifiAsset = assetToOptifiAsset(asset);

    //     let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, optifiAssetToNumber(optifiAsset));

    //     let [userAccount, _bump2] = await findUserAccount(context);

    //     let ix = await marginStress(context, asset);

    //     context.program.rpc.userMarginCalculate(
    //         {
    //             accounts: {
    //                 optifiExchange: exchangeAddress,
    //                 marginStressAccount: marginStressAddress,
    //                 userAccount: userAccount,
    //                 clock: SYSVAR_CLOCK_PUBKEY
    //             },
    //             instructions: ix
    //         }
    //     ).then((res) => {
    //         resolve({
    //             successful: true,
    //             data: res as TransactionSignature
    //         })
    //     }).catch((err) => reject(err))
    // }
}


export function marginCalculate(context: Context, userAccount: PublicKey
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {

        console.log("marginCalculate...");

        let [exchangeAddress, _] = await findExchangeAccount(context);

        Promise.all(SUPPORTED_ASSETS.map((asset) => new Promise(async () => {

            let optifiAsset = assetToOptifiAsset(asset);

            let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, optifiAssetToNumber(optifiAsset));

            let instructions = [increaseComputeUnitsIx]
            let marginStressIx = await marginStress(context, asset);
            instructions.push(...marginStressIx)

            context.program.rpc.userMarginCalculate(
                {
                    accounts: {
                        optifiExchange: exchangeAddress,
                        marginStressAccount: marginStressAddress,
                        userAccount: userAccount,
                        clock: SYSVAR_CLOCK_PUBKEY
                    },
                    instructions
                }
            ).then((res) => {
                resolve(
                    {
                        successful: true,
                        data: res as TransactionSignature
                    }
                )
                console.log({
                    successful: true,
                    data: res as TransactionSignature
                })
            }).catch((err) => console.log(err))
        }))).then(() => resolve({
            successful: true
        })
        ).catch((err) => reject(err));
    })
}