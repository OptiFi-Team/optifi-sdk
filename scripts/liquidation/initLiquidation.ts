import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import initLiquidation from "../../instructions/liquidation/initLiquidation";


let userToLiquidate = new PublicKey("9QEsU961hXuMQuKA1PDK17HAv1JiwxSnavGr5yrKCjZD");

initializeContext().then((context) => {
    initLiquidation(context, userToLiquidate).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})