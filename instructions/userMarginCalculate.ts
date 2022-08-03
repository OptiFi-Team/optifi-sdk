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


        let [exchangeAddress, _] = await findExchangeAccount(context);

        let [userAccountAddress,] = await findUserAccount(context)

        let res;

        for (let i = 0; i < SUPPORTED_ASSETS.length; i++) {

            let ixs = [increaseComputeUnitsIx]

            let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, SUPPORTED_ASSETS[i]);

            ixs.push(...await marginStress(context, SUPPORTED_ASSETS[i]));

            res = await context.program.rpc.userMarginCalculate({
                accounts: {
                    optifiExchange: exchangeAddress,
                    marginStressAccount: marginStressAddress,
                    userAccount: userAccountAddress,
                    clock: SYSVAR_CLOCK_PUBKEY
                },
                instructions: ixs
            });

            resolve({
                successful: true,
                data: res as TransactionSignature
            })

            // if (i == SUPPORTED_ASSETS.length - 1) {

            // } else {
            //     ixs.push(
            //         context.program.instruction.userMarginCalculate({
            //             accounts: {
            //                 optifiExchange: exchangeAddress,
            //                 marginStressAccount: marginStressAddress,
            //                 userAccount: userAccountAddress,
            //                 clock: SYSVAR_CLOCK_PUBKEY
            //             }
            //         })
            //     );
            // }
        }
    })
}