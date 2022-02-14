import { initializeContext } from "../index";
import { findOptifiMarkets, getPosition, isUserInitializedOnMarket } from "../utils/market";
import { findOrCreateAssociatedTokenAccount } from "../utils/token";
import { findUserAccount } from "../utils/accounts";

initializeContext().then((context) => {
    findUserAccount(context).then(([userAccountAddress, _]) => {
        findOptifiMarkets(context).then(async (markets) => {
            Promise.all(
                markets.map(async (market) => {
                    let [longAmount, shortAmount] = await getPosition(context,
                        market,
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