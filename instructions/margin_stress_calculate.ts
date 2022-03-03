import * as anchor from "@project-serum/anchor";
import Context from "../types/context";
import { PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY, SYSVAR_RENT_PUBKEY, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";

import Asset from "../types/asset";
import { findMarginStressWithAsset } from "../utils/margin";
import { findExchangeAccount, findOracleAccountFromAsset, OracleAccountType } from "../utils/accounts";
import { assetToOptifiAsset, numberToOptifiAsset, optifiAssetToNumber } from "../utils/generic";
import {
    Asset as OptifiAsset,
} from '../types/optifi-exchange-types';


export default function marginStressCalculate(context: Context,
    asset: Asset
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {

        let [exchangeAddress, _] = await findExchangeAccount(context);

        let optifiAsset = assetToOptifiAsset(asset);

        let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, optifiAssetToNumber(optifiAsset));

        let spotOracle =
            findOracleAccountFromAsset(
                context,
                numberToOptifiAsset(
                    asset
                )
            );
        let ivOracle =
            findOracleAccountFromAsset(
                context,
                numberToOptifiAsset(
                    asset
                ),
                OracleAccountType.Iv
            );
        let usdcSpotOracle =
            findOracleAccountFromAsset(
                context,
                OptifiAsset.USDC,
                OracleAccountType.Spot
            );

        context.program.rpc.marginStressSync(
            {
                accounts: {
                    optifiExchange: exchangeAddress,
                    marginStressAccount: marginStressAddress,
                    assetFeed: spotOracle,
                    usdcFeed: usdcSpotOracle,
                    ivFeed: ivOracle,
                    clock: SYSVAR_CLOCK_PUBKEY
                },
            }
        ).then((res) => {
            resolve({
                successful: true,
                data: res as TransactionSignature
            })
        }).catch((err) => reject(err))
    })
}