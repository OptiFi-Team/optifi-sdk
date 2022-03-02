import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../index";
import { InstrumentCommon, InstrumentUnique } from "../types/optifi-exchange-types";
import { Exchange } from "../types/optifi-exchange-types";
import { findOptifiExchange } from "../utils/accounts";

let marketId = new PublicKey("4eCGYyNZpZ4XfRbQXFTADX7Xuepb23eUjMGxdWrDnFS6");

initializeContext().then((context) => {
    findOptifiExchange(context).then(([exchangeAddress, _]) => {
        context.program.account.exchange.fetch(exchangeAddress).then((res) => {
            let optifiExchange = res as Exchange;
            console.log("Got Optifi Exchange ", optifiExchange);

            let common = optifiExchange.instrumentCommon as InstrumentCommon;
            console.log("Got instrument groups ", common);

            console.log("Got instrument uniques ", optifiExchange.instrumentUnique as InstrumentUnique);
        })
    })
})