import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import ammDeposit from "../../instructions/ammDeposit";
import { findOptifiExchange } from "../../utils/accounts";
import { findAMMWithIdx } from "../../utils/amm";
import { ammIndex } from "./constants";

let amount = 350; // already including decimals

// let ammAddress = new PublicKey("BqCCiwsymyNu66fiTiJ7UCBQqexZpNZpAF2QF18nkDnR");

initializeContext().then(async (context) => {
    let [optifiExchange,] = await findOptifiExchange(context)
    let [ammAddress,] = await findAMMWithIdx(context, optifiExchange, ammIndex)

    ammDeposit(context, ammAddress, amount).then((res) => {
        console.log("Got ammDeposit res", res);
    }).catch((err) => {
        console.error(err);
    })
})