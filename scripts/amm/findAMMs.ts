import { initializeContextWithoutWallet, initializeContext } from "../../index";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";
import { findAMMAccounts, getAmmEquity, getAmmEquityV2 } from "../../utils/amm";

initializeContextWithoutWallet().then(async (context) => {
    // findAMMAccounts(context).then((res) => {
    //     console.log(`Found ${res.length} amm accounts - `);
    //     for (let amm of res) {
    //         console.log("AMM - ", amm[0], " address ", formatExplorerAddress(
    //             context, amm[1].toString(),
    //             SolanaEntityType.Account)
    //         )
    //         console.log("amm liquidity: ", amm[0].totalLiquidityUsdc.toString())
    //         console.log("amm net delta: ", amm[0].netDelta.toString())
    //         console.log("amm proposal: ", amm[0].proposals)
    //     }
    // }).catch((err) => {
    //     console.error(err);
    // })

    let amms = await findAMMAccounts(context)
    getAmmEquityV2(context, amms).then((res) => {
        console.log(res);
    }).catch((err) => {
        console.error(err);
    })
}).catch((err) => {
    console.error(err);
})