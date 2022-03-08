import { initializeContext } from "../../index";
import { SUPPORTED_ASSETS } from "../../constants";
import Context from "../../types/context";
import { initializeAmm } from "../../instructions/initializeAmm";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";
import { AmmAccount, Duration, OptifiMarket } from "../../types/optifi-exchange-types";
import { findOptifiMarkets } from "../../utils/market";
import { findAMMWithIdx } from "../../utils/amm";
import { findOptifiExchange } from "../../utils/accounts";
import { PublicKey } from "@solana/web3.js";
import addInstrumentToAmm from "../../instructions/addInstrumentToAmm";
import syncPositions from "../../instructions/syncPositions";

async function syncAmmPositions(context: Context) {
    try {
        let ammIndex = 3;
        let [optifiExchange, _bump1] = await findOptifiExchange(context)
        let [ammAddress, _bump2] = await findAMMWithIdx(context, optifiExchange, ammIndex)
        let ammInfo = await context.program.account.ammAccount.fetch(ammAddress)
        let ammTradingInstruments = ammInfo.tradingInstruments.map(e => e.toString())

        let optifiMarketsToSync: PublicKey[] = []
        let optifiMarkets = await findOptifiMarkets(context)
        console.log(`Found ${optifiMarkets.length} optifi markets in total `);
        optifiMarkets.forEach(e => {
            if (ammTradingInstruments.includes(e[0].instrument.toString())) {
                optifiMarketsToSync.push(e[1])
            }
        })

        console.log("optifiMarketsToSync length: ", optifiMarketsToSync.length)

        for (let market of optifiMarketsToSync) {
            let res = await syncPositions(context, market, ammAddress)
            console.log(`successfully synced optifi market ${market.toString()} for amm ${ammAddress.toString()} with id ${ammIndex}`)
            console.log(res)
        }
    } catch (err) {
        console.error(err);
    }
}

initializeContext().then((context) => {
    syncAmmPositions(context)
})
