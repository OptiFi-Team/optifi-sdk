import { initializeContext } from "../../index";
import consumeWithdrawRequestQueue from "../../instructions/amm/consumeWithdrawRequestQueue";
import { findOptifiExchange } from "../../utils/accounts";
import { findAMMWithIdx } from "../../utils/amm";
import { ammIndex } from "./constants";

initializeContext().then(async (context) => {
    let [optifiExchange,] = await findOptifiExchange(context)
    let [ammAddress,] = await findAMMWithIdx(context, optifiExchange, ammIndex)

    consumeWithdrawRequestQueue(context, ammAddress).then((res) => {
        console.log("Got deposit res", res);
    }).catch((err) => {
        console.error(err);
    })
})