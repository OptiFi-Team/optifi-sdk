import { PublicKey } from "@solana/web3.js";
import initLiquidation from "../instructions/initLiquidation";
import Context from "../types/context";
import { TransactionSignature } from "@solana/web3.js";

import registerLiquidationMarket from "../instructions/registerLiquidationMarket";
import { findLiquidationState } from "../utils/accounts";
import { LiquidationState, UserAccount } from "../types/optifi-exchange-types";
import liquidatePosition from "../instructions/liquidatePosition";
import { marginCalculate } from "../instructions/userMarginCalculate";

export default async function liquidateUser(context: Context, userToLiquidate: PublicKey)
    : Promise<TransactionSignature[]> {
    let sigs: TransactionSignature[] = [];
    // initLiquidation
    {
        await marginCalculate(context, userToLiquidate);

        console.log("Start initialize liquidation...");
        let res = await initLiquidation(context, userToLiquidate);

        if (res.successful) {
            console.log("Initialized")
            sigs.push(res.data as TransactionSignature)
        } else {
            console.log("Initialization was unsuccessful");
            console.error(res);
        }
    }

    let tradingMarkets: PublicKey[] = [];

    // registerLiquidationMarket
    let register = async () => {
        console.log("Start register markets and cancel orders...");
        let res = await context.program.account.userAccount.fetch(userToLiquidate);
        let userAccount = res as unknown as UserAccount;
        tradingMarkets = userAccount.tradingMarkets;

        for (let marketAddress of tradingMarkets) {
            console.log(marketAddress.toString());
            let res = await registerLiquidationMarket(context, userToLiquidate, marketAddress);

            if (res.successful) {
                console.log("Register")
                sigs.push(res.data as TransactionSignature)
            } else {
                console.log("Register was unsuccessful");
                console.error(res);
            }
        }
    }
    await register();
    let liquidate = async () => {
        console.log("Start liquidate positions...");
        let [liquidationStateAddress, _] = await findLiquidationState(context, userToLiquidate);
        let res = await context.program.account.liquidationState.fetch(liquidationStateAddress);
        let liquidationState = res as unknown as LiquidationState;
        let liquidationMarkets = liquidationState.markets;
        if (liquidationMarkets.length > 0) {
            for (let marketAddress of liquidationMarkets) {
                console.log(marketAddress.toString());
                // registerLiquidationMarket
                let res = await liquidatePosition(context, userToLiquidate, marketAddress);

                if (res.successful) {
                    console.log("Register")
                    sigs.push(res.data as TransactionSignature)
                } else {
                    console.log("Register was unsuccessful");
                    console.error(res);
                }
                // Update margin requirement
                await marginCalculate(context, userToLiquidate);
            }
        } else {
            console.log("Finish liquidation...");
            let marketAddress = tradingMarkets[0];
            // registerLiquidationMarket
            console.log("start to run liquidatePosition")
            let res = await liquidatePosition(context, userToLiquidate, marketAddress);

            if (res.successful) {
                console.log("Register")
                sigs.push(res.data as TransactionSignature)
            } else {
                console.log("Register was unsuccessful");
                console.error(res);
            }
            // Update margin requirement
            console.log("start to run marginCalculate")
            await marginCalculate(context, userToLiquidate);
        }
    }
    await liquidate();
    return sigs;
}