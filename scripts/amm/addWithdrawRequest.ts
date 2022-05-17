import { initializeContext } from "../../index";
import addWithdrawRequest from "../../instructions/amm/addWithdrawRequest";
import { findOptifiExchange } from "../../utils/accounts";
import { findAMMWithIdx } from "../../utils/amm";
import { ammIndex } from "./constants";

let lpAmount = 10; // already including decimals


initializeContext().then(async (context) => {
    let [optifiExchange,] = await findOptifiExchange(context)
    let [ammAddress,] = await findAMMWithIdx(context, optifiExchange, ammIndex)
    
    addWithdrawRequest(context, ammAddress, lpAmount).then((res) => {
        console.log("Got withdraw res", res);
    }).catch((err) => {
        console.error(err);
    })
})