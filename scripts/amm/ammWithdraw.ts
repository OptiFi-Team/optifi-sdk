import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import ammWithdraw from "../../instructions/ammWithdraw";
import { findOptifiExchange } from "../../utils/accounts";
import { findAMMWithIdx } from "../../utils/amm";
import { ammIndex } from "./constants";

let amount = 100; // already including decimals

let ammAddress = new PublicKey("3i7QPGnhG9tHVdcYgr7xsMM6EwQvDYo2iW2HF1zvCxFg");

initializeContext().then(async (context) => {
    let [optifiExchange,] = await findOptifiExchange(context)
    let [ammAddress,] = await findAMMWithIdx(context, optifiExchange, ammIndex)
    
    ammWithdraw(context, ammAddress, amount).then((res) => {
        console.log("Got deposit res", res);
    }).catch((err) => {
        console.error(err);
    })
})