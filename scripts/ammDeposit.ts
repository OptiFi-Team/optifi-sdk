import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../index";
import ammDeposit from "../instructions/ammDeposit";

let amount = 100000; // already including decimals

let ammAddress = new PublicKey("3i7QPGnhG9tHVdcYgr7xsMM6EwQvDYo2iW2HF1zvCxFg");

initializeContext().then((context) => {
    ammDeposit(context, ammAddress, amount).then((res) => {
        console.log("Got deposit res", res);
    }).catch((err) => {
        console.error(err);
    })
})