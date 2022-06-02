import { initializeContext } from "../index";
import Context from "../types/context";
import boostrap from "../sequences/boostrap";
import { PublicKey } from "@solana/web3.js";
import { DEPOSIT_LIMIT, OG_NFT_MINT } from "../constants";

initializeContext().then((context: Context) => {
    console.log("Initialized")
    let ogNftMint = new PublicKey(OG_NFT_MINT[context.endpoint]); // decimal is zero
    let depositLimit = DEPOSIT_LIMIT; // decimal is zero

    boostrap(context, ogNftMint, depositLimit).then((res) => {
        console.log(res)
        console.log("Bootstrapped")
    }).catch((err) => {
        console.error(err);
        console.error("Got error");
    })
}).catch((err) => {
    console.error(err);
    console.error("Got error");
})