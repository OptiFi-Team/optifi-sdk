import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import liquidationSettleOrder from "../../instructions/liquidation/liquidationSettleOrder";


let userToLiquidate = new PublicKey("4ogSXowC5KsrJcAe2cqJRpSWs3gHK9wJ2UAf9kdmVfWa");

let marketAddress = new PublicKey("HtUgX9K4bFKZecrrTPK7zic9G3hDuqeCm6T57ypPeYBE");

initializeContext().then(async (context) => {
    liquidationSettleOrder(context, userToLiquidate, marketAddress).then((res) => {
        console.log("Got liquidationSettleOrder res", res);
    }).catch((err) => {
        console.error(err);
    })
})