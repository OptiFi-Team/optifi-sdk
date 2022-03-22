import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import initUserOnOptifiMarket from "../../instructions/initUserOnOptifiMarket";

let market = new PublicKey("3qCSVYhpkuJoNnkGtL2ddtt3LzB6B5jyx7EohFkCoZyw");

initializeContext().then((context) => {
    initUserOnOptifiMarket(context, market).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})