import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import liquidatePosition from "../../instructions/liquidatePosition";


let userToLiquidate = new PublicKey("9QEsU961hXuMQuKA1PDK17HAv1JiwxSnavGr5yrKCjZD");

let marketAddress = new PublicKey("EJpCyV6hfnQ8QsbmGweSUx6t2JchQoFgaxEiaRtV26p9");

initializeContext().then(async (context) => {

    liquidatePosition(context, userToLiquidate, marketAddress).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})