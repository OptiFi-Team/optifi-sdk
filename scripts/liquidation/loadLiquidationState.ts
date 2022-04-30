import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import liquidateUser, { sortMarketsFromValues } from "../../sequences/liquidateUser";
import { LiquidationState, LiquidationStatus } from "../../types/optifi-exchange-types";
import { findLiquidationState } from "../../utils/accounts";


let userToLiquidate = new PublicKey("6k1Wxd3qekJfRpEpThyQpNEY4vLtXkwSY9LZ2fTr7JCG");


initializeContext().then(async (context) => {
    let [liquidationStateAddress, _] = await findLiquidationState(context, userToLiquidate);
    let res = await context.program.account.liquidationState.fetch(liquidationStateAddress);
    // @ts-ignore
    let liquidationState = res as LiquidationState;
    let liquidationMarkets = liquidationState.markets;
    let liquidationValues = liquidationState.values.map(v => v.toNumber());
    // sort the liquidationMarkets by values
    console.log("liquidationMarkets before: " + liquidationMarkets);
    console.log("liquidationValues before: " + liquidationValues);
    [liquidationMarkets, liquidationValues] = await sortMarketsFromValues(liquidationMarkets, liquidationValues);
    console.log("liquidationMarkets after: " + liquidationMarkets);
    console.log("liquidationValues after: " + liquidationValues);

    // @ts-ignore
    console.log("status: " + Object.keys(liquidationState.status)[0]);
})