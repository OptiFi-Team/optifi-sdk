import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import liquidateUser from "../../sequences/liquidateUser";


let userToLiquidate = new PublicKey("9wJTJhgnivUV28pk4y3teU5HAM1hfXbap3NBvTGoizVB");


initializeContext().then((context) => {
    liquidateUser(context, userToLiquidate).then((res) => {
        console.log("Got liquidateUser res", res);
    }).catch((err) => {
        console.error(err);
    })
})