import { initializeContext } from "../../index";
import { findAMMAccounts } from "../../utils/amm";
import { formatExplorerAddress, logFormatted, SolanaEntityType } from "../../utils/debug";

initializeContext().then((context) => {
    findAMMAccounts(context).then((ammAccounts) => {
        console.log("Found amm accounts - ", ammAccounts.map((a) => {
            logFormatted({
                "Address": a[1].toString(),
                "Explorer": formatExplorerAddress(context, a[1].toString(), SolanaEntityType.Account),
                "Data": a[0],
            })
        }))
    })
})