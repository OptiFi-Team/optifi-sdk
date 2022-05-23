import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import settleOrderFunds from "../../instructions/order/settleOrderFunds";
import { findUserAccount } from "../../utils/accounts";
import { findOptifiMarkets } from "../../utils/market";
import { getSerumMarket, settleSerumFundsIfAnyUnsettled } from "../../utils/serum";


initializeContext().then((context) => {
    findOptifiMarkets(context).then(async (markets) => {
        let unsettleMarkets: Array<PublicKey> = [];
        const findUnsettleMarkets = async () => {
            for (let market of markets) {
                const [userAccountAddressKey] = await findUserAccount(context);
                const serumMarket = await getSerumMarket(context, market[0].serumMarket);
                const openOrdersRes = await serumMarket.findOpenOrdersAccountsForOwner(
                    context.connection,
                    userAccountAddressKey
                );
                console.log("Check the market: ", market[1].toString());
                let [userAccountAddress, _] = await findUserAccount(context);
                let res = await context.program.account.userAccount.fetch(userAccountAddress);
                // @ts-ignore
                let userAccount = res as UserAccount;
                openOrdersRes
                    .filter(async ({ baseTokenFree, quoteTokenFree }) => {
                        if (baseTokenFree.toNumber() > 0 || quoteTokenFree.toNumber() > 0) {
                            console.log("Find unsettle options: ", baseTokenFree.toNumber());
                            console.log("Find unsettle usdc: ", quoteTokenFree.toNumber());
                            // unsettleMarkets.push(market[1]);
                            let unsettleMarkets = [market[1]];
                            let res = await settleOrderFunds(context, unsettleMarkets, userAccount);
                            if (res) {
                                console.log(res);
                            }
                        }
                    });
            };
        }
        findUnsettleMarkets();
        // findUnsettleMarkets().then(async () => {
        //     // if (unsettleMarkets.length > 0) {
        //     //     console.log("Start settle the markets: ", unsettleMarkets.toString());
        //     //     let res = await settleOrderFunds(context, unsettleMarkets);
        //     //     if (res) {
        //     //         console.log(res);
        //     //     }
        //     // }
        // })
    })
})