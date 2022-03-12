import { PublicKey } from "@solana/web3.js";
import Context from "../../types/context";
import { initializeContext } from "../../index";
import { ammCancelOrders } from "../../instructions/ammCancelOrders";
import ammDeposit from "../../instructions/ammDeposit";
import { ammUpdateOrders } from "../../instructions/ammUpdateOrders";
import { findOptifiExchange } from "../../utils/accounts";
import { findAMMWithIdx } from "../../utils/amm";
import { findOptifiMarkets } from "../../utils/market";

let ammIndex = 1;

export async function executeAmmOrderProposal(context: Context, ammIndex: number) {
    try {
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
            console.log(`proposalsForOneInstrument for instrument: ${proposalsForOneInstrument.instrument.toString()} with flag ${i}`,)
            console.log(proposalsForOneInstrument)
            proposalsForOneInstrument.askOrdersPrice.forEach((e, i) => {
                console.log("askOrdersPrice", e.toString())
                console.log("askOrdersSize: ", proposalsForOneInstrument.askOrdersSize[i].toString())
            });
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
                // execute all the proposal orders
                for (let j = 0; j < proposalsForOneInstrument.bidOrdersSize.length + proposalsForOneInstrument.askOrdersSize.length; j++) {
                    let res = await ammUpdateOrders(context, 1, ammAddress, i, market[1])
                    console.log(`successfully updated orders for amm ${ammAddress.toString()} with id ${ammIndex}`)
                    console.log(res)
                }
            }
            // }
        };
    } catch (err) {
        console.error(err);
    }
}

initializeContext().then((context) => {
    executeAmmOrderProposal(context, ammIndex)
})
