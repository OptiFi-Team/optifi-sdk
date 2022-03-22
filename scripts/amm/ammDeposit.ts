import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import ammDeposit from "../../instructions/ammDeposit";

let amount = 1000000; // already including decimals

let ammAddress = new PublicKey("ETtfLt1Vx5pdFiVh8frCz2SYF67Y6rx15ESmBami33mX");

initializeContext().then((context) => {
    ammDeposit(context, ammAddress, amount).then((res) => {
        console.log("Got deposit res", res);
    }).catch((err) => {
        console.error(err);
    })
})