import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import initUserOnOptifiMarket from "../../instructions/initUserOnOptifiMarket";

let market = new PublicKey("EJpCyV6hfnQ8QsbmGweSUx6t2JchQoFgaxEiaRtV26p9");

initializeContext().then((context) => {
    initUserOnOptifiMarket(context, market).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})