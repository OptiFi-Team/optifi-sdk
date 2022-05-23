import { initializeContext } from "../../index";
import settleOrderFunds from "../../instructions/order/settleOrderFunds";
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
    let [userAccountAddress, _] = await findUserAccount(context);
    let result = await context.program.account.userAccount.fetch(userAccountAddress);
    // @ts-ignore
    let userAccount = result as UserAccount;
    let res = await settleOrderFunds(context, [market], userAccount);
    if (res) {
        console.log(res);
    }

    // await sleep(1000);
    // await userMarginCalculate(context);
})