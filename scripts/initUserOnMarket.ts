import {PublicKey} from "@solana/web3.js";
import {initializeContext} from "../index";
import initUserOnOptifiMarket from "../instructions/initUserOnOptifiMarket";

let market = new PublicKey("7qsPrAov6iryrUsAnjd4XpvBhJXyLFfg4GqeUQNmQYNg");

initializeContext().then((context) => {
    initUserOnOptifiMarket(context, market).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})