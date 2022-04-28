// @ts-ignore
import { initializeContext } from "../../index";
import Context from "../../types/context";

import { stopOptifiMarket } from "../../instructions/optifiMarket/stopOptifiMarket";
import { PublicKey } from "@solana/web3.js";

const marketAddress = new PublicKey("jAPyyZqQLG6nSwoaa6MHTkrtEpkvqfTrm5XGYdBr4gQ")

initializeContext().then(async (context: Context) => {
    let res = await stopOptifiMarket(context, marketAddress)
    console.log("stopOptifiMarket res: ", res)
})
