import Context from "../types/context";
import { SYSVAR_CLOCK_PUBKEY, Transaction, TransactionInstruction, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";

import Asset from "../types/asset";
import { findMarginStressWithAsset } from "../utils/margin";
import { findExchangeAccount, findParseOptimizedOracleAccountFromAsset, OracleAccountType } from "../utils/accounts";
import { assetToOptifiAsset, numberToOptifiAsset, optifiAssetToNumber } from "../utils/generic";
import {
    Asset as OptifiAsset,
} from '../types/optifi-exchange-types';
import { debugAnchorAccount } from "../utils/debug";
import { STRIKE_LADDER_SIZE } from "../constants";
import { Exchange } from "../types/optifi-exchange-types";
import { findOptifiExchange } from "../utils/accounts";

export default function marginStress(context: Context,
    asset: number
): Promise<TransactionInstruction[]> {
    return new Promise(async (resolve, reject) => {

        try {
            let [exchangeAddress, _] = await findExchangeAccount(context);

            let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, asset);

            let spotOracle =
                await findParseOptimizedOracleAccountFromAsset(
                    context,
                    numberToOptifiAsset(
                        asset
                    )
                );
            let ivOracle =
                await findParseOptimizedOracleAccountFromAsset(
                    context,
                    numberToOptifiAsset(
                        asset
                    ),
                    OracleAccountType.Iv
                );
            let usdcSpotOracle =
                await findParseOptimizedOracleAccountFromAsset(
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

            //get strike len
            let [exchange, __] = await findOptifiExchange(context)
            let res = await context.program.account.exchange.fetch(exchange)
            let optifiExchange = res as Exchange;
            //@ts-ignore
            let strikeLen =  optifiExchange.instrumentUnique[asset].length;
            for (let i = 0; i < strikeLen; i++) {
                instructions.push(ix2);
            }

            resolve(instructions)
        } catch (e) {
            console.error(e);
            reject(e)
        }
    })
}