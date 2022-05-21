import { initializeContext } from "../../index";
import { SUPPORTED_ASSETS } from "../../constants";
import Context from "../../types/context";
import { initializeAmm } from "../../instructions/initializeAmm";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";
import { AmmAccount, Chain, Duration, OptifiMarket } from "../../types/optifi-exchange-types";
import { findOptifiMarkets } from "../../utils/market";
import { findAMMWithIdx } from "../../utils/amm";
import { findOptifiExchange } from "../../utils/accounts";
import { PublicKey } from "@solana/web3.js";
import addInstrumentToAmm from "../../instructions/addInstrumentToAmm";
import { ammIndex } from "./constants";
import { findMarginStressWithAsset } from "../../utils/margin";

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

        let instrumentAddresses =  marginStressAccountInfo.instruments
        // let instrumentRawInfos = await context.program.account.chain.fetchMultiple(instrumentAddresses)
        // let instrumentInfos = instrumentRawInfos as Chain[]

        console.log("optifiMarkets: ", optifiMarkets.map(e => e[1].toString()))
        console.log("instrumentAddresses: ", instrumentAddresses.map(e => e.toString()))
        console.log("ammInfo.tradingInstruments: ", ammInfo.tradingInstruments.map(e => e.toString()))
        instrumentAddresses.forEach((instrument, i) => {
            if (!ammInfo.tradingInstruments.map(e => e.toString()).includes(instrumentAddresses[i].toString())) {
                let index = optifiMarkets.findIndex(optifiMarket => optifiMarket[0].instrument.toString() == instrument.toString() )
                optifiMarketsToAdd.push(optifiMarkets[index][1])
            }
        })

        for (let market of optifiMarketsToAdd) {
            console.log(`start to add optifi market ${market.toString()} to amm ${ammAddress.toString()} with id ${ammIndex}`)
            let res = await addInstrumentToAmm(context, ammAddress, market)
            console.log(`successfully added optifi market ${market.toString()} to amm ${ammAddress.toString()} with id ${ammIndex}`)
            // console.log(res)
        }
    } catch (err) {
        console.error(err);
    }
}

initializeContext().then((context) => {
    addInstrumentsToAmm(context, ammIndex)
})
