import Context from "../../types/context";
import { AmmAccount, AmmState, Duration, Asset, OptifiMarket } from "../../types/optifi-exchange-types";
import { findOptifiMarkets } from "../../utils/market";
import { findAMMWithIdx } from "../../utils/amm";
import { findOptifiExchange } from "../../utils/accounts";
import { PublicKey } from "@solana/web3.js";
import syncPositions from "../../instructions/syncPositions";
import ammSyncFuturesPositions from "../../instructions/amm/ammSyncFuturesPositions";
import calculateAmmDelta from "../../instructions/calculateAmmDelta";
import calculateAmmProposal from "../../instructions/calculateAmmProposal";
import { ammCancelOrders } from "../../instructions/ammCancelOrders";
import { ammUpdateOrders } from "../../instructions/ammUpdateOrders";
import ammUpdateFuturesPositions from "../../instructions/amm/ammUpdateFutureOrders";
import { MANGO_PERP_MARKETS } from "../../constants";


export async function syncAmmPositions(context: Context, ammIndex: number) {
    try {
        let [optifiExchange, _bump1] = await findOptifiExchange(context)
        let [ammAddress, _bump2] = await findAMMWithIdx(context, optifiExchange, ammIndex)
        let ammInfoRaw = await context.program.account.ammAccount.fetch(ammAddress)
        // @ts-ignore
        let ammInfo = ammInfoRaw as AmmAccount;
        let ammTradingInstruments = ammInfo.tradingInstruments.map(e => e.toString())

        let optifiMarketsRaw = await findOptifiMarkets(context)

        // @ts-ignore
        let optifiMarkets = optifiMarketsRaw as [OptifiMarket, PublicKey][];
        console.log(`Found ${optifiMarkets.length} optifi markets in total `);
        ammTradingInstruments.forEach(async (instrument, i) => {
            // @ts-ignore
            if (!ammInfo.flags[i]) {
                // @ts-ignore
                let market = optifiMarkets.find(e => e[0].instrument.toString() == instrument) as [OptifiMarket, PublicKey]
                // console.log(market)
                if (market) {
                    let res = await syncPositions(context, market[1], ammAddress)
                    console.log(`successfully synced postions on optifi market ${market[1].toString()} for amm ${ammAddress.toString()} with id ${ammIndex}`)
                    console.log(res)
                }
            } else {
                console.log(`found flag: ${i} - instrument: ${instrument} already been done`)
            }
        })

    } catch (err) {
        console.error(err);
    }
}

export async function syncAmmFuturePositions(context: Context, ammIndex: number) {
    try {
        let [optifiExchange, _bump1] = await findOptifiExchange(context)
        let [ammAddress, _bump2] = await findAMMWithIdx(context, optifiExchange, ammIndex)
        let ammInfoRaw = await context.program.account.ammAccount.fetch(ammAddress)
        // @ts-ignore
        let ammInfo = ammInfoRaw as AmmAccount;
        let ammTradingInstruments = ammInfo.tradingInstruments.map(e => e.toString())

        console.log(ammTradingInstruments.length)
        let res = await ammSyncFuturesPositions(context, ammAddress)
        console.log(`successfully synced futures postions for amm ${ammAddress.toString()} with id ${ammIndex}`)
        console.log(res)
    } catch (err) {
        console.error(err);
    }
}

export async function updateAmmFutureOrders(context: Context, ammIndex: number) {
    try {
        let [optifiExchange, _bump1] = await findOptifiExchange(context)
        let [ammAddress, _bump2] = await findAMMWithIdx(context, optifiExchange, ammIndex)
        let ammInfoRaw = await context.program.account.ammAccount.fetch(ammAddress)
        // @ts-ignore
        let ammInfo = ammInfoRaw as AmmAccount;
        let ammTradingInstruments = ammInfo.tradingInstruments.map(e => e.toString())

        console.log(ammTradingInstruments.length)
        let res = await ammUpdateFuturesPositions(context, ammAddress)
        console.log(`successfully synced futures orders for amm ${ammAddress.toString()} with id ${ammIndex}`)
        console.log(res)
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

        let ammInfoRaw = await context.program.account.ammAccount.fetch(ammAddress)
        // @ts-ignore
        let ammInfo = ammInfoRaw as AmmAccount;
        console.log(`to calc proposals for amm: ${ammAddress.toString()} with id ${ammIndex}`)
        // @ts-ignore
        for (let i = 1; i < ammInfo.flags.length; i++) {
            let res = await calculateAmmProposal(context, ammAddress)
            console.log(`successfully calc proposals for amm for amm ${ammAddress.toString()} with id ${ammIndex}`)
            console.log(res)
        }
    } catch (err) {
        console.error(err);
    }
}


export async function executeAmmOrderProposalV2(context: Context, ammIndex: number) {
    try {
        let [optifiExchange, _bump1] = await findOptifiExchange(context)
        let [ammAddress, _bump2] = await findAMMWithIdx(context, optifiExchange, ammIndex)
        let ammInfo = await context.program.account.ammAccount.fetch(ammAddress)

        let optifiMarkets = await findOptifiMarkets(context)
        console.log(`Found ${optifiMarkets.length} optifi markets in total `);

        // @ts-ignore
        for (let i = 0; i < ammInfo.proposals.length; i++) {
            // @ts-ignore
            if (!ammInfo.flags[i + 1]) {
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
                let market = optifiMarkets.find(e => e[0].instrument.toString() == proposalsForOneInstrument.instrument.toString())!
                console.log(`start to update orders for amm ${ammAddress.toString()} with id ${ammIndex}`)
                // execute all the proposal orders
                for (let j = 0; j < proposalsForOneInstrument.bidOrdersSize.length + proposalsForOneInstrument.askOrdersSize.length; j++) {
                    let res = await ammUpdateOrders(context, 1, ammAddress, i, market[1])
                    console.log(`successfully updated orders for amm ${ammAddress.toString()} with id ${ammIndex}, flag idx: ${i}`)
                    console.log(res)
                }
            }
        };
    } catch (err) {
        console.error(err);
    }
}


export async function executeAmmOrderProposal(context: Context, ammIndex: number) {
    try {
        let [optifiExchange, _bump1] = await findOptifiExchange(context)
        let [ammAddress, _bump2] = await findAMMWithIdx(context, optifiExchange, ammIndex)
        let ammInfo = await context.program.account.ammAccount.fetch(ammAddress)

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

                if (!proposalsForOneInstrument.isStarted) {
                    console.log(`start to cancel previous orders for amm ${ammAddress.toString()} with id ${ammIndex}`)
                    // to prune all preivious orders 
                    let res = await ammCancelOrders(context, ammAddress, market[1])
                    console.log(`successfully cancelled orders for amm ${ammAddress.toString()} with id ${ammIndex}`)
                    console.log(res)
                } else {
                    console.log(`start to update orders for amm ${ammAddress.toString()} with id ${ammIndex}`)
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


export function getMangoPerpMarketInfoByAsset(context: Context, asset: number) {
    let configs = MANGO_PERP_MARKETS[context.endpoint]
    switch (asset) {
        case 0:
            return configs[0]
        case 1:
            return configs[1]
        default:
    }
}