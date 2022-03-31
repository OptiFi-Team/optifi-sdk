import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import initUserOnOptifiMarket from "../../instructions/initUserOnOptifiMarket";

let market = new PublicKey("GHtSNAhYsgPUcg4ZTPjp5g4ttq2cqaJBvt7YiHEVqbwb");

initializeContext().then((context) => {
    initUserOnOptifiMarket(context, market).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})