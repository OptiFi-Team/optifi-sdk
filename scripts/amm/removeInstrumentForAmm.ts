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
import removeInstrumentFromAmm from "../../instructions/removeInstrumentFromAmm";

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
        for (let market of optifiMarketsToRemove) {
            console.log( ammAddress.toString(), market.toString())

            let res = await removeInstrumentFromAmm(context, ammAddress, market)
            console.log(`successfully removed optifi market ${market.toString()} from amm ${ammAddress.toString()} with id ${ammIndex}`)
            console.log(res)
        }
    } catch (err) {
        console.error(err);
    }
}

initializeContext().then((context) => {
    removeInstrumentsFromAmm(context, ammIndex)
})
