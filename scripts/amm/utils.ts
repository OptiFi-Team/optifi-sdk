import Context from "../../types/context";
import { AmmAccount, AmmState, Duration, OptifiMarket } from "../../types/optifi-exchange-types";
import { findOptifiMarkets } from "../../utils/market";
import { findAMMWithIdx } from "../../utils/amm";
import { findOptifiExchange } from "../../utils/accounts";
import { PublicKey } from "@solana/web3.js";
import syncPositions from "../../instructions/syncPositions";
import calculateAmmDelta from "../../instructions/calculateAmmDelta";
import calculateAmmProposal from "../../instructions/calculateAmmProposal";
import { ammCancelOrders } from "../../instructions/ammCancelOrders";
import { ammUpdateOrders } from "../../instructions/ammUpdateOrders";


export async function syncAmmPositions(context: Context, ammIndex: number) {
    try {
        let [optifiExchange, _bump1] = await findOptifiExchange(context)
        let [ammAddress, _bump2] = await findAMMWithIdx(context, optifiExchange, ammIndex)
        let ammInfoRaw = await context.program.account.ammAccount.fetch(ammAddress)
        // @ts-ignore
        let ammInfo = ammInfoRaw as AmmState;
        let ammTradingInstruments = ammInfo.tradingInstruments.map(e => e.toString())

        let optifiMarketsRaw = await findOptifiMarkets(context)

        // @ts-ignore
        let optifiMarkets = optifiMarketsRaw as [OptifiMarket, PublicKey][];
        console.log(`Found ${optifiMarkets.length} optifi markets in total `);
        ammTradingInstruments.forEach(async (instrument, i) => {
            if (!ammInfo.flags[i]) {
                // @ts-ignore
                let market = optifiMarkets.find(e => e[0].instrument.toString() == instrument) as [OptifiMarket, PublicKey]
                // console.log(market)
                let res = await syncPositions(context, market[1], ammAddress)
                console.log(`successfully synced optifi market ${market[1].toString()} for amm ${ammAddress.toString()} with id ${ammIndex}`)
                console.log(res)
            } else {
                console.log(`found flag: ${i} - instrument: ${instrument} already been done`)
            }
        })

    } catch (err) {
        console.error(err);
    }
}


export async function calcAmmDelta(context: Context, ammIndex: number) {
    try {
        let [optifiExchange, _bump1] = await findOptifiExchange(context)
        let [ammAddress, _bump2] = await findAMMWithIdx(context, optifiExchange, ammIndex)
        console.log(`to calc delta for amm: ${ammAddress.toString()} with id ${ammIndex}`)
        let res = await calculateAmmDelta(context, ammAddress)
        console.log(`successfully calc delta for amm for amm ${ammAddress.toString()} with id ${ammIndex}`)
        console.log(res)
    } catch (err) {
        console.error(err);
    }
}

export async function calculateAmmProposals(context: Context, ammIndex: number) {
    try {
        let [optifiExchange, _bump1] = await findOptifiExchange(context)
        let [ammAddress, _bump2] = await findAMMWithIdx(context, optifiExchange, ammIndex)
        console.log(`to calc proposals for amm: ${ammAddress.toString()} with id ${ammIndex}`)
        for (let i = 0; i < 18; i++) {
            let res = await calculateAmmProposal(context, ammAddress)
            console.log(`successfully calc proposals for amm for amm ${ammAddress.toString()} with id ${ammIndex}`)
            console.log(res)
        }
    } catch (err) {
        console.error(err);
    }
}


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
            if (!ammInfo.flags[i]) {
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
            }
            // }
        };
    } catch (err) {
        console.error(err);
    }
}
