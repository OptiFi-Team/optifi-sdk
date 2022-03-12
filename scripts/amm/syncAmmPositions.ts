import { initializeContext } from "../../index";
import { SUPPORTED_ASSETS } from "../../constants";
import Context from "../../types/context";
import { initializeAmm } from "../../instructions/initializeAmm";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";
import { AmmAccount, AmmState, Duration, OptifiMarket } from "../../types/optifi-exchange-types";
import { findOptifiMarkets } from "../../utils/market";
import { findAMMWithIdx } from "../../utils/amm";
import { findOptifiExchange } from "../../utils/accounts";
import { PublicKey } from "@solana/web3.js";
import addInstrumentToAmm from "../../instructions/addInstrumentToAmm";
import syncPositions from "../../instructions/syncPositions";

let ammIndex = 1;

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

initializeContext().then((context) => {
    syncAmmPositions(context, ammIndex)
})
