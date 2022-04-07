import { PublicKey } from "@solana/web3.js";
import initLiquidation from "../instructions/liquidation/initLiquidation";
import Context from "../types/context";
import { TransactionSignature } from "@solana/web3.js";

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
    : Promise<TransactionSignature[]> {
    let sigs: TransactionSignature[] = [];
    // initLiquidation
    // {
    //     await marginCalculate(context, userToLiquidate);

    //     console.log("Start initialize liquidation...");
    // let res = await initLiquidation(context, userToLiquidate);

    //     if (res.successful) {
    //         console.log("Initialized")
    //         sigs.push(res.data as TransactionSignature)
    //     } else {
    //         console.log("Initialization was unsuccessful");
    //         console.error(res);
    //     }
    // }

    let tradingMarkets: PublicKey[] = [];

    // registerLiquidationMarket
    let register = async () => {
        console.log("Start register markets and cancel orders...");
        let res = await context.program.account.userAccount.fetch(userToLiquidate);
        let userAccount = res as unknown as UserAccount;
        tradingMarkets = userAccount.tradingMarkets;

        for (let marketAddress of tradingMarkets) {
            let res = await registerLiquidationMarket(context, userToLiquidate, marketAddress);

            if (res.successful) {
                console.log("Register")
                sigs.push(res.data as TransactionSignature)
            } else {
                console.log("Register was unsuccessful");
                console.error(res);
            }
        }
        await sleep(5000);
    }
    // await register();
    let liquidate = async () => {
        console.log("Start liquidate positions...");
        let [liquidationStateAddress, _] = await findLiquidationState(context, userToLiquidate);
        let res = await context.program.account.liquidationState.fetch(liquidationStateAddress);
        let liquidationState = res as unknown as LiquidationState;
        let liquidationMarkets = liquidationState.markets;
        if (liquidationMarkets.length > 0) {
            let marketsWithKeys = await findOptifiMarkets(context, liquidationMarkets);
            for (let market of marketsWithKeys) {
                let marketAddress = market[1];

                console.log(marketAddress.toString());
                // registerLiquidationMarket
                // await liquidationPlaceOrder(context, userToLiquidate, marketAddress);

                // Wait for order filled
                const serumMarket = await getSerumMarket(context, market[0].serumMarket);

                let waitForSettle = async () => {
                    const openOrdersRes = await serumMarket.findOpenOrdersAccountsForOwner(
                        context.connection,
                        userToLiquidate
                    );
                    console.log("Wating for order filled...");
                    console.log(openOrdersRes);
                    openOrdersRes
                        .filter(async ({ baseTokenFree, quoteTokenTotal }) => {
                            if (baseTokenFree.toNumber() > 0 && quoteTokenTotal.toNumber() == 0) {
                                console.log("Find unsettle options: ", baseTokenFree.toNumber());
                                let res = await liquidationSettleOrder(context, userToLiquidate, marketAddress);
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
                            else {
                                console.log("baseTokenFree:", baseTokenFree.toNumber())
                                console.log("quoteTokenTotal:", quoteTokenTotal.toNumber())
                                await sleep(10000);
                                waitForSettle()
                            }
                        });
                }
                await waitForSettle();
            }
        } else {
            console.log("Finish liquidation...");
            let marketAddress = tradingMarkets[0];
            // registerLiquidationMarket
            console.log("start to run liquidationPlaceOrder")
            let res = await liquidationPlaceOrder(context, userToLiquidate, marketAddress);

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