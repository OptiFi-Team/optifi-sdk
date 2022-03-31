import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import ammDeposit from "../../instructions/ammDeposit";

let amount = 1000000; // already including decimals

let ammAddress = new PublicKey("BqCCiwsymyNu66fiTiJ7UCBQqexZpNZpAF2QF18nkDnR");

initializeContext().then((context) => {
    ammDeposit(context, ammAddress, amount).then((res) => {
        console.log("Got deposit res", res);
    }).catch((err) => {
        console.error(err);
    })
})