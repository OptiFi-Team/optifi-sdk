import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../index";
import initLiquidation from "../instructions/initLiquidation";

import registerLiquidationMarket from "../instructions/registerLiquidationMarket";
import { findLiquidationState } from "../utils/accounts";
import { LiquidationState, UserAccount } from "../types/optifi-exchange-types";
import liquidatePosition from "../instructions/liquidatePosition";
import { marginCalculate } from "../instructions/userMarginCalculate";

let userToLiquidate = new PublicKey("HhHKqF8rDAmdS8G6p3GrNguWjWLDxn2opcgyxDYKw3Sc");

initializeContext().then(async (context) => {
    // initLiquidation
    await initLiquidation(context, userToLiquidate).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    });

    let tradingMarkets: PublicKey[];

    // registerLiquidationMarket
    let register = async () => {

        let res = await context.program.account.userAccount.fetch(userToLiquidate);
        let userAccount = res as unknown as UserAccount;
        tradingMarkets = userAccount.tradingMarkets;

        for await (let marketAddress of tradingMarkets) {
            console.log(marketAddress.toString());
            await registerLiquidationMarket(context, userToLiquidate, marketAddress).then((res) => {
                console.log("Got init res", res);
            }).catch((err) => {
                console.error(err);
            })
        }
    }
    await register();
    let liquidate = async () => {
        let [liquidationStateAddress, _] = await findLiquidationState(context, userToLiquidate);
        let res = await context.program.account.liquidationState.fetch(liquidationStateAddress);
        let liquidationState = res as unknown as LiquidationState;
        let liquidationMarkets = liquidationState.markets;
        if (liquidationMarkets.length > 0) {
            for await (let marketAddress of liquidationMarkets) {
                // Update margin requirement
                await marginCalculate(context, userToLiquidate);

                // registerLiquidationMarket
                console.log(marketAddress.toString());
                await liquidatePosition(context, userToLiquidate, marketAddress).then((res) => {
                    console.log("Got init res", res);
                }).catch((err) => {
                    console.error(err);
                });
            }
        } else {
            let marketAddress = tradingMarkets[0];

            // Update margin requirement
            await marginCalculate(context, userToLiquidate);

            // registerLiquidationMarket
            console.log(marketAddress.toString());
            await liquidatePosition(context, userToLiquidate, marketAddress).then((res) => {
                console.log("Got init res", res);
            }).catch((err) => {
                console.error(err);
            });
        }
    }
    await liquidate();
})
