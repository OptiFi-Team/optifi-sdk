import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import liquidatePosition from "../../instructions/liquidatePosition";


let userToLiquidate = new PublicKey("9wJTJhgnivUV28pk4y3teU5HAM1hfXbap3NBvTGoizVB");

let marketAddress = new PublicKey("3qCSVYhpkuJoNnkGtL2ddtt3LzB6B5jyx7EohFkCoZyw");

initializeContext().then(async (context) => {

    liquidatePosition(context, userToLiquidate, marketAddress).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})