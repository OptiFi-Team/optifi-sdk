import Context from "../types/context";
import { SYSVAR_CLOCK_PUBKEY, Transaction, TransactionInstruction, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";

import Asset from "../types/asset";
import { findMarginStressWithAsset } from "../utils/margin";
import { findExchangeAccount, findOracleAccountFromAsset, OracleAccountType } from "../utils/accounts";
import { assetToOptifiAsset, numberToOptifiAsset, optifiAssetToNumber } from "../utils/generic";
import {
    Asset as OptifiAsset,
} from '../types/optifi-exchange-types';
import { debugAnchorAccount } from "../utils/debug";


export default function marginStress(context: Context,
    asset: number
): Promise<TransactionInstruction[]> {
    return new Promise(async (resolve, reject) => {

        try {
            let [exchangeAddress, _] = await findExchangeAccount(context);

            let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, asset);

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

            let ix1 = context.program.instruction.marginStressSync(
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
            );

            let ix2 = context.program.instruction.marginStressCalculate(
                {
                    accounts: {
                        optifiExchange: exchangeAddress,
                        marginStressAccount: marginStressAddress,
                    },
                }
            );

            let instructions: TransactionInstruction[] = []

            instructions.push(ix1);

            for (let i = 0; i < 9; i++) {
                instructions.push(ix2);
            }

            resolve(instructions)
        } catch (e) {
            console.error(e);
            reject(e)
        }
    })
}