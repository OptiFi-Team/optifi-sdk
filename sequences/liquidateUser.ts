import { PublicKey } from "@solana/web3.js";
import initLiquidation from "../instructions/liquidation/initLiquidation";
import Context from "../types/context";
import { TransactionSignature } from "@solana/web3.js";
import { Market } from "@project-serum/serum";

import registerLiquidationMarket from "../instructions/liquidation/registerLiquidationMarket";
import { findLiquidationState } from "../utils/accounts";
import { LiquidationState, UserAccount } from "../types/optifi-exchange-types";
import liquidationPlaceOrder from "../instructions/liquidation/liquidationPlaceOrder";
import { marginCalculate } from "../instructions/userMarginCalculate";
import liquidationSettleOrder from "../instructions/liquidation/liquidationSettleOrder";
import { getSerumMarket } from "../utils/serum";
import { findOptifiMarkets } from "../utils/market";
import { sleep } from "../utils/generic";

export default async function liquidateUser(context: Context, userToLiquidate: PublicKey)
    : Promise<void> {
    // // update margin requirement
    // await marginCalculate(context, userToLiquidate);

    // // initLiquidation
    // console.log("Start initialize liquidation...");

    // await initLiquidation(context, userToLiquidate).then((res) => {
    //     console.log("Got initLiquidation res", res);
    // }).catch((err) => {
    //     console.error(err);
    // })

    // // registerLiquidationMarket
    // console.log("Start register markets and cancel orders...");
    // let res = await context.program.account.userAccount.fetch(userToLiquidate);
    // let userAccount = res as unknown as UserAccount;
    // let tradingMarkets = userAccount.tradingMarkets;

    // for (let marketAddress of tradingMarkets) {
    //     await registerLiquidationMarket(context, userToLiquidate, marketAddress).then((res) => {
    //         console.log("Got registerLiquidationMarket res", res, "on market", marketAddress.toString());
    //     }).catch((err) => {
    //         console.error(err);
    //     })
    // }
    // console.log("Wait 10 secs...");
    // await sleep(10000);

    let liquidate = async () => {
        let [liquidationStateAddress, _] = await findLiquidationState(context, userToLiquidate);
        let res = await context.program.account.liquidationState.fetch(liquidationStateAddress);
        let liquidationState = res as unknown as LiquidationState;
        let liquidationMarkets = liquidationState.markets;
        let marketsWithKeys = await findOptifiMarkets(context, liquidationMarkets);
        // the length of marketsWithKeys should not be zero
        console.log("Start liquidate positions with ", marketsWithKeys.length, " markets");
        for (let market of marketsWithKeys) {
            let marketAddress = market[1];

            // Liquidation Place Order
            await liquidationPlaceOrder(context, userToLiquidate, marketAddress).then((res) => {
                console.log("Got liquidationPlaceOrder res", res, " on market ", marketAddress.toString());
            }).catch((err) => {
                console.error(err);
            });

            // Wait for order filled
            let serumMarket = await getSerumMarket(context, market[0].serumMarket);
            await waitForSettle(context, serumMarket, userToLiquidate, marketAddress)
        }
    }
    await liquidate();
}


async function waitForSettle(context: Context, serumMarket: Market, userToLiquidate: PublicKey, marketAddress: PublicKey) {

    const openOrdersRes = await serumMarket.findOpenOrdersAccountsForOwner(
        context.connection,
        userToLiquidate
    );
    openOrdersRes
        .filter(async ({ baseTokenFree, quoteTokenTotal }) => {
            if (baseTokenFree.toNumber() > 0 && quoteTokenTotal.toNumber() == 0) {
                console.log("Find unsettle options: ", baseTokenFree.toNumber());
                liquidationSettleOrder(context, userToLiquidate, marketAddress).then((res) => {
                    console.log("Got liquidationSettleOrder res", res);
                }).catch((err) => {
                    console.error(err);
                });
            } else {
                console.log("Wating 10 secs for order filled...");
                await sleep(10000);
                await waitForSettle(context, serumMarket, userToLiquidate, marketAddress)
            }
        });
}