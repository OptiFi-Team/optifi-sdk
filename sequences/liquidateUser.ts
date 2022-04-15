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
import { findOptifiMarkets, getTokenAmount, watchGetTokenUiAmount } from "../utils/market";
import { sleep } from "../utils/generic";
import { sortAndDeduplicateDiagnostics } from "typescript";
import { resolve } from "path";
import { rejects } from "assert";

export async function sortMarketsFromValues(liquidationMarkets: PublicKey[], liquidationValues: number[])
    : Promise<[PublicKey[], number[]]> {
    return new Promise((resolve, rejects) => {
        try {
            if (liquidationMarkets.length != liquidationValues.length) {
                console.log("liquidationMarkets is not equal to liquidationValues");
            }

            for (let i = 0; i < liquidationValues.length; i++) {

                let min = liquidationValues[i];
                let marketsMinValues = liquidationMarkets[i];
                let minIndex = i;

                for (let j = i; j < liquidationValues.length; j++) {
                    if (liquidationValues[j] < min) {
                        min = liquidationValues[j];
                        marketsMinValues = liquidationMarkets[j];

                        minIndex = j;
                    }
                }

                [liquidationValues[minIndex], liquidationValues[i]] = [liquidationValues[i], liquidationValues[minIndex]];
                [liquidationMarkets[minIndex], liquidationMarkets[i]] = [liquidationMarkets[i], liquidationMarkets[minIndex]];
            }
            resolve([liquidationMarkets, liquidationValues]);
        } catch (err) {
            rejects(err)
        }
    })


}

export default async function liquidateUser(context: Context, userToLiquidate: PublicKey)
    : Promise<void> {
    // update margin requirement
    // TODO add this ix into init liquidation
    await marginCalculate(context, userToLiquidate);

    // initLiquidation
    console.log("Start initialize liquidation...");

    let [liquidationStateAddress, _] = await findLiquidationState(context, userToLiquidate);
    let res = await context.program.account.liquidationState.fetch(liquidationStateAddress);
    // @ts-ignore
    let liquidationState = res as LiquidationState;
    console.log("liquidationState: " + Object.keys(liquidationState.status)[0]);

    if (Object.keys(liquidationState.status)[0] == 'healthy') {
        await initLiquidation(context, userToLiquidate).then((res) => {
            console.log("Got initLiquidation res", res);
        }).catch((err) => {
            console.error(err);
        });
        console.log("Wait 20 secs...");
        await sleep(20000);
    }

    res = await context.program.account.liquidationState.fetch(liquidationStateAddress);
    // @ts-ignore
    let liquidationState = res as LiquidationState;
    console.log("liquidationState: " + Object.keys(liquidationState.status)[0]);

    // registerLiquidationMarket
    if (Object.keys(liquidationState.status)[0] == 'cancelOrder') {
        console.log("Start register markets and cancel orders...");
        res = await context.program.account.userAccount.fetch(userToLiquidate);
        let userAccount = res as unknown as UserAccount;
        let tradingMarkets = userAccount.tradingMarkets;

        for (let marketAddress of tradingMarkets) {
            await registerLiquidationMarket(context, userToLiquidate, marketAddress).then((res) => {
                console.log("Got registerLiquidationMarket res", res, "on market", marketAddress.toString());
            }).catch((err) => {
                console.error(err);
            })
        }
        console.log("Wait 20 secs...");
        await sleep(20000);
    }

    res = await context.program.account.liquidationState.fetch(liquidationStateAddress);
    // @ts-ignore
    let liquidationState = res as LiquidationState;
    console.log("liquidationState: " + Object.keys(liquidationState.status)[0]);

    if (Object.keys(liquidationState.status)[0] == 'placeOrder' || 'settleOrder') {
        let liquidate = async () => {
            let res = await context.program.account.liquidationState.fetch(liquidationStateAddress);
            // @ts-ignore
            let liquidationState = res as LiquidationState;
            let liquidationMarkets = liquidationState.markets;
            let liquidationValues = liquidationState.values.map(v => v.toNumber());
            // sort the liquidationMarkets by values
            // console.log("liquidationMarkets before: " + liquidationMarkets);
            // console.log("liquidationValues before: " + liquidationValues);
            [liquidationMarkets, liquidationValues] = await sortMarketsFromValues(liquidationMarkets, liquidationValues);
            console.log("liquidationMarkets: " + liquidationMarkets);
            console.log("liquidationValues: " + liquidationValues);
            console.log("Wait 10 secs...");
            await sleep(10000);

            let marketsWithKeys = await findOptifiMarkets(context, liquidationMarkets);
            // the length of marketsWithKeys should not be zero
            console.log("Start liquidate positions with ", marketsWithKeys.length, " markets");
            for (let market of marketsWithKeys) {
                let marketAddress = market[1];
                console.log("marketAddress: " + marketAddress + " liquidationState: " + Object.keys(liquidationState.status)[0]);
                let shortAmount = await getTokenAmount(context, market[0].instrumentShortSplToken, userToLiquidate);
                if (Object.keys(liquidationState.status)[0] == 'placeOrder') {
                    // Liquidation Place Order
                    console.log("Place liquidation order...");
                    await liquidationPlaceOrder(context, userToLiquidate, marketAddress).then((res) => {
                        console.log("Got liquidationPlaceOrder res", res, " on market ", marketAddress.toString());
                    }).catch((err) => {
                        console.error(err);
                    });
                }
                // Wait for order filled
                console.log("Wait for liquidation settlement...");
                let serumMarket = await getSerumMarket(context, market[0].serumMarket);
                await waitForSettle(context, serumMarket, userToLiquidate, marketAddress, shortAmount);

                console.log("Wating 10 secs for next market...");
                await sleep(10000);
            }
        }
        await liquidate();
    }
    console.log("Finish liquidate user!");
}


async function waitForSettle(context: Context, serumMarket: Market, userToLiquidate: PublicKey, marketAddress: PublicKey, shortAmount: number) {

    const openOrdersRes = await serumMarket.findOpenOrdersAccountsForOwner(
        context.connection,
        userToLiquidate
    );

    console.log("Already filled: ", openOrdersRes[0].baseTokenFree.toNumber(), "Target amount: ", shortAmount);

    if (openOrdersRes[0].baseTokenFree.toNumber() == shortAmount) {
        console.log("Find unsettle options: ", openOrdersRes[0].baseTokenFree.toNumber());
        liquidationSettleOrder(context, userToLiquidate, marketAddress).then((res) => {
            console.log("Got liquidationSettleOrder res", res);
        }).catch((err) => {
            console.error(err);
        });
    };
    console.log("Wating 10 secs for order filled...");
    await sleep(10000);
    await waitForSettle(context, serumMarket, userToLiquidate, marketAddress, shortAmount)
}