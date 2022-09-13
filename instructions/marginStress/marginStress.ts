import Context from "../../types/context";
import { TransactionInstruction } from "@solana/web3.js";
import { findMarginStressWithAsset } from "../../utils/margin";
import { findExchangeAccount, findOracleAccountFromAsset, OracleAccountType } from "../../utils/accounts";
import { numberToOptifiAsset } from "../../utils/generic";
import {
    Asset as OptifiAsset,
} from '../../types/optifi-exchange-types';

export default function marginStress(context: Context,
    asset: number
): Promise<TransactionInstruction[]> {
    return new Promise(async (resolve, reject) => {

        try {
            let [exchangeAddress, _] = await findExchangeAccount(context);

            let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, asset);

            let spotOracle =
                await findOracleAccountFromAsset(
                    context,
                    numberToOptifiAsset(
                        asset
                    )
                );
            let usdcSpotOracle =
                await findOracleAccountFromAsset(
                    context,
                    OptifiAsset.USDC,
                    OracleAccountType.Spot
                );

            let ix2 = context.program.instruction.marginStressCalculate(
                {
                    accounts: {
                        optifiExchange: exchangeAddress,
                        marginStressAccount: marginStressAddress,
                        assetFeed: spotOracle,
                        usdcFeed: usdcSpotOracle,
                    },
                }
            );

            let instructions: TransactionInstruction[] = []

            // instructions.push(ix1);
            instructions.push(ix2);

            resolve(instructions)
        } catch (e) {
            console.error(e);
            reject(e)
        }
    })
}