import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import initLiquidation from "../../instructions/initLiquidation";


let userToLiquidate = new PublicKey("7yZe39mKS1jEGY3U68FcB9LDpsS8j2Vit5MSr6vqQ9FA");

initializeContext().then((context) => {
    initLiquidation(context, userToLiquidate).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})