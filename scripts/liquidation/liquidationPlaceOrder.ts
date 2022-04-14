import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import liquidationPlaceOrder from "../../instructions/liquidation/liquidationPlaceOrder";


let userToLiquidate = new PublicKey("29GMKthkVfAXUj9D9nKivuBEzrgkZCojsbbGTjf8JUbJ");

let marketAddress = new PublicKey("GY15E5hP9sx9ZiUbg2YkWRD4dkV5SEWkXirRTaPCzB5Z");

initializeContext().then(async (context) => {

    liquidationPlaceOrder(context, userToLiquidate, marketAddress).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})