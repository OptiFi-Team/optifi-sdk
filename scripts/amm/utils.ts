import Context from "../../types/context";
import { AmmAccount, AmmState, Duration, Asset, OptifiMarket, Chain } from "../../types/optifi-exchange-types";
import { findOptifiMarkets } from "../../utils/market";
import { findAMMWithIdx } from "../../utils/amm";
import { findOptifiExchange } from "../../utils/accounts";
import { PublicKey } from "@solana/web3.js";
import syncPositions, { syncPositionsInBatch } from "../../instructions/syncPositions";
import ammSyncFuturesPositions from "../../instructions/amm/ammSyncFuturesPositions";
import calculateAmmDelta from "../../instructions/calculateAmmDelta";
import calculateAmmProposal, { calculateAmmProposalInBatch } from "../../instructions/calculateAmmProposal";
import { ammUpdateOrders } from "../../instructions/ammUpdateOrders";
import ammUpdateFuturesPositions from "../../instructions/amm/ammUpdateFutureOrders";
import { MANGO_PERP_MARKETS } from "../../constants";
import { sleep } from "../../utils/generic";
import addInstrumentToAmm from "../../instructions/addInstrumentToAmm";
import { findMarginStressWithAsset } from "../../utils/margin";
import removeInstrumentFromAmm from "../../instructions/removeInstrumentFromAmm";

export async function addInstrumentsToAmm(context: Context, ammIndex: number) {
    try {
        let [optifiExchange, _bump1] = await findOptifiExchange(context)
        let [ammAddress, _bump2] = await findAMMWithIdx(context, optifiExchange, ammIndex)
        let ammInfo = await context.program.account.ammAccount.fetch(ammAddress)

        // @ts-ignore
        let amm = ammInfo as AmmAccount;

        let [marginStressAccount,] = await findMarginStressWithAsset(context, optifiExchange, amm.asset)

        let marginStressAccountInfo = await context.program.account.marginStressAccount.fetch(marginStressAccount);

        let optifiMarketsToAdd: PublicKey[] = []
        let optifiMarkets = await findOptifiMarkets(context)
        console.log(`Found ${optifiMarkets.length} optifi markets in total `);

        let instrumentAddresses = marginStressAccountInfo.instruments
        // let instrumentRawInfos = await context.program.account.chain.fetchMultiple(instrumentAddresses)
        // let instrumentInfos = instrumentRawInfos as Chain[]

        console.log("optifiMarkets: ", optifiMarkets.map(e => e[1].toString()))
        console.log("instrumentAddresses: ", instrumentAddresses.map(e => e.toString()))
        console.log("ammInfo.tradingInstruments: ", ammInfo.tradingInstruments.map(e => e.toString()))
        instrumentAddresses.forEach((instrument, i) => {
            if (!ammInfo.tradingInstruments.map(e => e.toString()).includes(instrumentAddresses[i].toString())) {
                let index = optifiMarkets.findIndex(optifiMarket => optifiMarket[0].instrument.toString() == instrument.toString())
                optifiMarketsToAdd.push(optifiMarkets[index][1])
            }
        })

        for (let market of optifiMarketsToAdd) {
            console.log(`start to add optifi market ${market.toString()} to amm ${ammAddress.toString()} with id ${ammIndex}`)
            let res = await addInstrumentToAmm(context, ammAddress, market)
            console.log(res)
            console.log(`successfully added optifi market ${market.toString()} to amm ${ammAddress.toString()} with id ${ammIndex}`)
        }
    } catch (err) {
        console.error(err);
    }
}


export async function removeInstrumentsFromAmm(context: Context, ammIndex: number) {
    try {
        let [optifiExchange, _bump1] = await findOptifiExchange(context)
        let [ammAddress, _bump2] = await findAMMWithIdx(context, optifiExchange, ammIndex)
        let ammInfo = await context.program.account.ammAccount.fetch(ammAddress)
        let optifiMarketsToAdd: PublicKey[] = []
        let optifiMarkets = await findOptifiMarkets(context)
        console.log(`Found ${optifiMarkets.length} optifi markets in total `);


        let instrumentAddresses = optifiMarkets.map(e => e[0].instrument)

        let instrumentRawInfos = await context.program.account.chain.fetchMultiple(instrumentAddresses)

        let instrumentInfos = instrumentRawInfos as Chain[]

        let now = new Date().getTime()
        let optifiMarketsToRemove = ammInfo.tradingInstruments.slice(1).filter(instrument => {
            let index = instrumentAddresses.findIndex(e => e.toString() == instrument.toString())
            return !(index >= 0 && instrumentInfos[index].expiryDate.toNumber() * 1000 > now)
        });
        // for (let market of optifiMarketsToRemove) {
        optifiMarketsToRemove.forEach(async market => {
            console.log(ammAddress.toString(), market.toString())

            let res = await removeInstrumentFromAmm(context, ammAddress, market)
            console.log(`successfully removed optifi market ${market.toString()} from amm ${ammAddress.toString()} with id ${ammIndex}`)
            console.log(res)
        })
        // }
    } catch (err) {
        console.error(err);
    }
}


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
        let optifiMarketsToSync: [OptifiMarket, PublicKey][] = []
        ammTradingInstruments.forEach(async (instrument, i) => {
            // @ts-ignore
            if (!ammInfo.flags[i]) {
                // @ts-ignore
                let market = optifiMarkets.find(e => e[0].instrument.toString() == instrument) as [OptifiMarket, PublicKey]
                if (market) {
                    optifiMarketsToSync.push(market)
                }
            } else {
                console.log(`found flag: ${i} - instrument: ${instrument} already been done`)
            }
        })

        const batchSize = 5;
        let batches = splitToBatch(optifiMarketsToSync, batchSize)
        batches.forEach(async (batch, i) => {
            let res = await syncPositionsInBatch(context, optifiExchange, ammAddress, ammInfo, batch)
            console.log(`successfully synced postions in batch for amm ${ammAddress.toString()} with id ${ammIndex}, batch id ${i}`)
            console.log(res)
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

        let res = await ammUpdateFuturesPositions(context, ammAddress)
        console.log(`successfully updated futures orders for amm ${ammAddress.toString()} with id ${ammIndex}`)
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

        const firstBtchSize = 3;
        const batchSize = 7;
        // @ts-ignore
        const optionFlags: boolean[] = ammInfo.flags.slice(1).filter(e => e == false)
        if (optionFlags.length == 0) {
            let res = await calculateAmmProposalInBatch(context, ammAddress, ammInfo, 0, 1)
            console.log(`successfully calc proposals in batch for amm ${ammAddress.toString()} with id ${ammIndex}, batch id ${0}`)
            console.log(res)
        } else {
            let batches: boolean[][] = [];
            batches[0] = optionFlags.splice(0, firstBtchSize)
            batches.push(...splitToBatch(optionFlags, batchSize))
            batches.forEach(async (batch, i) => {
                let res = await calculateAmmProposalInBatch(context, ammAddress, ammInfo, i, batch.length)
                console.log(`successfully calc proposals in batch for amm ${ammAddress.toString()} with id ${ammIndex}, batch id ${i}`)
                console.log(res)
            })
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

        let optifiMarkets = await findOptifiMarkets(context)
        console.log(`Found ${optifiMarkets.length} optifi markets in total `);

        // @ts-ignore
        Array.from(Array(ammInfo.proposals.length).keys()).forEach(async (e, i) => {
            // await sleep(0.5 * 1000)

            // @ts-ignore
            if (!ammInfo.flags[i + 1]) {
                // @ts-ignore
                let proposalsForOneInstrument = ammInfo.proposals[i]
                // console.log("ammInfo.quoteTokenVault: ", ammInfo.quoteTokenVault.toString())
                // console.log(`proposalsForOneInstrument for instrument: ${proposalsForOneInstrument.instrument.toString()} with flag ${i}`,)
                // console.log(proposalsForOneInstrument)
                // proposalsForOneInstrument.askOrdersPrice.forEach((e, i) => {
                //     console.log("askOrdersPrice", e.toString())
                //     console.log("askOrdersSize: ", proposalsForOneInstrument.askOrdersSize[i].toString())
                // });
                // proposalsForOneInstrument.bidOrdersPrice.forEach((e, i) => {
                //     console.log("bidOrdersPrice", e.toString())
                //     console.log("bidOrdersSize: ", proposalsForOneInstrument.bidOrdersSize[i].toString())
                // });
                let market = optifiMarkets.find(e => e[0].instrument.toString() == proposalsForOneInstrument.instrument.toString())!
                console.log(`start to update orders for amm ${ammAddress.toString()} with id ${ammIndex}, flag idx: ${i}`)
                // execute all the proposal orders
                let res = await ammUpdateOrders(context, 5, ammAddress, i, market[1])
                console.log(`successfully updated orders for amm ${ammAddress.toString()} with id ${ammIndex}, flag idx: ${i}`)
                console.log(res)

            }
        })
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

// helper function to split an array into batches, length of each batch is <= batchSize
export function splitToBatch<Type>(arr: Type[], batchSize: number): Type[][] {
    let res: Type[][] = []
    for (let i = 0; i < arr.length; i += batchSize) {
        res.push(arr.slice(i, i + batchSize));
    }
    return res
}