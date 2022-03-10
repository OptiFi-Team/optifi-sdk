import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import { ammCancelOrders } from "../../instructions/ammCancelOrders";
import ammDeposit from "../../instructions/ammDeposit";
import { ammUpdateOrders } from "../../instructions/ammUpdateOrders";
import { findOptifiExchange } from "../../utils/accounts";
import { findAMMWithIdx } from "../../utils/amm";
import { findOptifiMarkets } from "../../utils/market";

let amount = 500000; // already including decimals

let ammAddress = new PublicKey("5YkaBQyPuhj1dXs4NL6YmxJNTL6ytYNS94K4bGyv5DaC");

initializeContext().then(async (context) => {

    try {
        let ammIndex = 1;
        let [optifiExchange, _bump1] = await findOptifiExchange(context)
        let [ammAddress, _bump2] = await findAMMWithIdx(context, optifiExchange, ammIndex)
        let ammInfo = await context.program.account.ammAccount.fetch(ammAddress)
        ammInfo.proposals
        let optifiMarketsToAdd: PublicKey[] = []
        let optifiMarkets = await findOptifiMarkets(context)
        console.log(`Found ${optifiMarkets.length} optifi markets in total `);
        let tradingMarkets = optifiMarkets.filter(market => ammInfo.tradingInstruments.map(e => e.toString()).includes(market[0].instrument.toString()))

        // @ts-ignore
        for (let i = 0; i < ammInfo.proposals.length; i++) {
            // @ts-ignore
            let proposalsForOneInstrument = ammInfo.proposals[i]
            console.log("ammInfo.quoteTokenVault: ", ammInfo.quoteTokenVault.toString())
            console.log(proposalsForOneInstrument)
            proposalsForOneInstrument.bidOrdersPrice.forEach((e, i) => {
                console.log("bidOrdersPrice", e.toString())
                console.log("bidOrdersSize: ", proposalsForOneInstrument.bidOrdersSize[i].toString())
            });
            // for (let proposal of proposalsForOneInstrument) {
            let market = optifiMarkets.find(e => e[0].instrument.toString() == proposalsForOneInstrument.instrument.toString())!
            console.log(`start to update orders for amm ${ammAddress.toString()} with id ${ammIndex}`)
            if (!proposalsForOneInstrument.isStarted) {
                // to prune all preivious orders 
                let res = await ammCancelOrders(context, ammAddress, market[1])
                console.log(`successfully cancelled orders for amm ${ammAddress.toString()} with id ${ammIndex}`)
                console.log(res)
            } else {
                let res = await ammUpdateOrders(context, 1, ammAddress, i, market[1])
                console.log(`successfully updated orders for amm ${ammAddress.toString()} with id ${ammIndex}`)
                console.log(res)
            }
            // }
        };
    } catch (err) {
        console.error(err);
    }
})