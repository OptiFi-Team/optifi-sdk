import { initializeContext } from "../index";
import { findOptifiMarkets, getPosition, isUserInitializedOnMarket } from "../utils/market";
import { findOrCreateAssociatedTokenAccount } from "../utils/token";
import { findUserAccount } from "../utils/accounts";
import { UserAccount } from "../types/optifi-exchange-types";
import UserPosition from "../types/user";

initializeContext().then((context) => {
    findUserAccount(context).then(([userAccountAddress, _]) => {
        findOptifiMarkets(context).then(async (markets) => {
            let res = await context.program.account.userAccount.fetch(userAccountAddress);
            // @ts-ignore
            let userAccount = res as UserAccount;
            let positions = userAccount.positions as UserPosition[];
            let tradingMarkets = markets.filter(market => positions.map(e => e.toString()).includes(market[0].instrument.toString()));
            console.log(positions);
            Promise.all(
                tradingMarkets.map(async (market) => {
                    let [longAmount, shortAmount] = await getPosition(context,
                        market[0],
                        userAccountAddress,
                    );
                    console.log(`market: ${market[1]}\n`);
                    console.log(`long tokens: ${longAmount}\n`);
                    console.log(`short tokens: ${shortAmount}\n`);
                })
            )
        }).catch((err) => console.log(err))
    })
})