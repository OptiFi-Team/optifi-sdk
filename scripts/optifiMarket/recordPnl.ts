// @ts-ignore
import { initializeContext } from "../../index";
import Context from "../../types/context";

import { stopOptifiMarket } from "../../instructions/optifiMarket/stopOptifiMarket";
import { PublicKey } from "@solana/web3.js";
import recordPnl from "../../instructions/optifiMarket/recordPnlForUser";

const marketAddress = new PublicKey("HfkCN8PqydJisRKsL2bqBf5hZG14GdRaFLUe9w8qBJ9W")
const userAccount = new PublicKey("A7qL6NgxW4WfwX3pJgSswGtGLpTFMrc7szZtkKHuMpTy")
initializeContext().then(async (context: Context) => {
    let res = await recordPnl(context, userAccount,marketAddress )
    console.log("recordPnl res: ", res)
})
