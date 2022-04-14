import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import liquidateUser from "../../sequences/liquidateUser";


let userToLiquidate = new PublicKey("6k1Wxd3qekJfRpEpThyQpNEY4vLtXkwSY9LZ2fTr7JCG");


initializeContext().then((context) => {
    liquidateUser(context, userToLiquidate).then((res) => {
        console.log("Got liquidateUser res", res);
    }).catch((err) => {
        console.error(err);
    })
})