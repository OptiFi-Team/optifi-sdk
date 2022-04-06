import { initializeContext } from "../../index";
import settleOrderFunds from "../../instructions/settleOrderFunds";
import { market } from "../constants"
import { findUserAccount } from "../../utils/accounts";
import { getSerumMarket } from "../../utils/serum";

initializeContext().then(async (context) => {
    console.log("Start settle the markets: ", market.toString());

    const [userAccountAddressKey] = await findUserAccount(context);

    let marketRes = await context.program.account.optifiMarket.fetch(market);
    const serumMarket = await getSerumMarket(context, marketRes.serumMarket);
    const openOrdersRes = await serumMarket.findOpenOrdersAccountsForOwner(
        context.connection,
        userAccountAddressKey
    );

    // console.log(openOrdersRes);

    openOrdersRes
        .filter(async ({ baseTokenFree, baseTokenTotal, quoteTokenFree, quoteTokenTotal }) => {
            console.log("baseTokenFree ", baseTokenFree.toNumber());
            console.log("baseTokenTotal ", baseTokenTotal.toNumber());
            console.log("quoteTokenFree ", quoteTokenFree.toNumber());
            console.log("quoteTokenTotal ", quoteTokenTotal.toNumber());
        });

    let res = await settleOrderFunds(context, [market]);
    if (res) {
        console.log(res);
    }

    // await sleep(1000);
    // await userMarginCalculate(context);
})