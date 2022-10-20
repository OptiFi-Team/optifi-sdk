// @ts-ignore
import { initializeContext } from "../../index";
import Context from "../../types/context";

import { PublicKey } from "@solana/web3.js";
import transferDeliveryFee from "../../instructions/optifiMarket/transferDeliveryFee";


initializeContext().then(async (context: Context) => {
    let res = await transferDeliveryFee(context)
    console.log("transferDeliveryFee res: ", res)
})
