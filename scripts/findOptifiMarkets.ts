import { initializeContext } from "../index";
import { findExpiredMarkets, findOptifiMarkets, findStoppableOptifiMarkets } from "../utils/market";
import { formatExplorerAddress, SolanaEntityType } from "../utils/debug";
import { Chain } from "../types/optifi-exchange-types";
import { getSerumMarketPrice } from "../utils/serum";


let seenAssets = new Set();

initializeContext().then(async (context) => {
    // let res = await context.program.account.optifiMarket.fetch("9S5cPERFvK26PkVtgv9mb7UjgWpPRoSSM4fj6wtZdUA6")
    // console.log(res)

    // let res = await findStoppableOptifiMarkets(context)
    // console.log("findStoppableOptifiMarkets res: ", res)

    findOptifiMarkets(context).then(async (res) => {
        console.log(`Found ${res.length} optifi markets - `);
        for (let market of res) {
            console.log("Market - address: ", market[1].toString(), "market info: ", market[0], "Solana explorer: ", formatExplorerAddress(
                context, market[1].toString(),
                SolanaEntityType.Account)
            );
            console.log("Instrument address is ", market[0].instrument.toString());
            await getSerumMarketPrice(context, market[0].serumMarket).then((marketPrice) => {
                console.log("Market price is ", marketPrice);
            }).catch((err) => console.error(err));

            await context.program.account.chain.fetch(market[0].instrument).then((instrumentRes) => {
                // @ts-ignore
                let chain = instrumentRes as Chain;
                seenAssets.add(instrumentRes.asset);
                console.log("Chain ", chain);
                console.log("Chain asset: ", chain.asset, " strike: ", chain.strike.toString(), " instrumentType: ", chain.instrumentType);
                console.log(new Date(chain.expiryDate.toNumber() * 1000).toLocaleDateString());
            })

            console.log("------------------------------------------------------")
        }
        console.log("Seen assets - ", seenAssets);
    }).catch((err) => {
        console.error(err);
    })
}).catch((err) => {
    console.error(err);
})