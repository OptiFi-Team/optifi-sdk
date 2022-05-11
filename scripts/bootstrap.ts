import { initializeContext } from "../index";
import Context from "../types/context";
import boostrap from "../sequences/boostrap";
import { PublicKey } from "@solana/web3.js";
import { DEPOSIT_LIMIT } from "../constants";

initializeContext().then((context: Context) => {
    console.log("Initialized")
    let ogNftMint = new PublicKey("4bWGR29Mp4rXnC2h1hRWh77Ktj3WzHUMzpxfeukAytsw"); // decimal is zero
    let depositLimit = DEPOSIT_LIMIT; // decimal is zero

    boostrap(context, undefined, depositLimit).then((res) => {
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