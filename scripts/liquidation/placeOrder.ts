import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import liquidationPlaceOrder from "../../instructions/liquidation/liquidationPlaceOrder";


let userToLiquidate = new PublicKey("6k1Wxd3qekJfRpEpThyQpNEY4vLtXkwSY9LZ2fTr7JCG");

let marketAddress = new PublicKey("3hxXJY31dssmmvfKcXp8n4VWjHVGSkWhwZFRreyJpBrz");

initializeContext().then(async (context) => {

    liquidationPlaceOrder(context, userToLiquidate, marketAddress).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})