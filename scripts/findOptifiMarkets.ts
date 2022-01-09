import {initializeContext} from "../index";
import {findOptifiMarkets} from "../utils/market";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";


initializeContext().then((context) => {
    findOptifiMarkets(context).then((res) => {
        console.log(`Found ${res.length} optifi markets - `);
        for (let market of res) {
            console.log("Market - ", market[0], " address ", formatExplorerAddress(
                context, market[1].toString(),
                SolanaEntityType.Account)
            )
        }
    }).catch((err) => {
        console.error(err);
    })
}).catch((err) => {
    console.error(err);
})