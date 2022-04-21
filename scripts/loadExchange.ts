import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../index";
import { Exchange } from "../types/optifi-exchange-types";
import { findOptifiExchange } from "../utils/accounts";


initializeContext().then((context) => {
    findOptifiExchange(context).then(([exchangeAddress, _]) => {
        console.log("exchangeAddress: ", exchangeAddress.toString())
        context.program.account.exchange.fetch(exchangeAddress).then((res) => {
            let optifiExchange = res as Exchange;
            console.log("Got Optifi Exchange ", optifiExchange);

            let common = optifiExchange.instrumentCommon;
            console.log("Got instrument groups ", common);

            console.log("Got instrument uniques ", optifiExchange.instrumentUnique);
        })
    })
})