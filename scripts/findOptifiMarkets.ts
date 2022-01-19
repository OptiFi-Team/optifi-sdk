import {initializeContext} from "../index";
import {findOptifiMarkets} from "../utils/market";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";
import {Chain} from "../types/optifi-exchange-types";
import {getSerumMarketPrice} from "../utils/serum";


initializeContext().then((context) => {
    findOptifiMarkets(context).then(async (res) => {
        console.log(`Found ${res.length} optifi markets - `);
        for (let market of res) {
            console.log("Market - ", market[0], " address ", formatExplorerAddress(
                context, market[1].toString(),
                SolanaEntityType.Account)
            );
            await getSerumMarketPrice(context, market[0].serumMarket).then((marketPrice) => {
                console.log("Market price is ", marketPrice);
            }).catch((err) => console.error(err));

            await context.program.account.chain.fetch(market[0].instrument).then((instrumentRes) => {
                console.log("Instruemnt res asset ", instrumentRes.asset);
                // @ts-ignore
                let chain = instrumentRes as Chain;
                console.log("Chain ", chain);
                console.log(new Date(chain.expiryDate.toNumber() * 1000).toLocaleDateString());
            })
        }
    }).catch((err) => {
        console.error(err);
    })
}).catch((err) => {
    console.error(err);
})