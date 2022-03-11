import { initializeContextWithoutWallet, initializeContext } from "../../index";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";
import { findAMMAccounts, getAmmEquity } from "../../utils/amm";

initializeContextWithoutWallet().then((context) => {
    findAMMAccounts(context).then((res) => {
        console.log(`Found ${res.length} amm accounts - `);
        for (let amm of res) {
            console.log("AMM - ", amm[0], " address ", formatExplorerAddress(
                context, amm[1].toString(),
                SolanaEntityType.Account)
            )
        }
    }).catch((err) => {
        console.error(err);
    })
    getAmmEquity(context).then((res) => {
        console.log(res);
    }).catch((err) => {
        console.error(err);
    })
}).catch((err) => {
    console.error(err);
})