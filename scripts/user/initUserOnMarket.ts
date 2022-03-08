import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import initUserOnOptifiMarket from "../../instructions/initUserOnOptifiMarket";

let market = new PublicKey("Cr96pBgTtVBGV3uc7NkHcuzFU5E2Cgcr19M8p8ZP2bbW");

initializeContext().then((context) => {
    initUserOnOptifiMarket(context, market).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})