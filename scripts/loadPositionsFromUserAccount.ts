import { initializeContext } from "../index";
import { findOptifiMarketsWithFullData, getUserPositions } from "../utils/market";
import { findUserAccount } from "../utils/accounts";
import { loadPositionsFromUserAccount } from "../utils/market"
import { UserAccount } from "../types/optifi-exchange-types";

initializeContext().then(async (context) => {
    //refer: logUserPositions.ts
    let [userAccountAddress, _] = await findUserAccount(context);
    let res = await context.program.account.userAccount.fetch(userAccountAddress);
    // @ts-ignore
    let userAccount = res as UserAccount;

    // prepare market prices
    let optifiMarkets = await findOptifiMarketsWithFullData(context);

    let positions = await loadPositionsFromUserAccount(context, userAccount, optifiMarkets);
    console.log(positions);
})