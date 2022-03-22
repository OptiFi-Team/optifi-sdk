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

let ammIndex = 1;

export async function addInstrumentsToAmm(context: Context, ammIndex: number) {
    try {
        let [optifiExchange, _bump1] = await findOptifiExchange(context)
        let [ammAddress, _bump2] = await findAMMWithIdx(context, optifiExchange, ammIndex)
        let ammInfo = await context.program.account.ammAccount.fetch(ammAddress)

        let optifiMarketsToAdd: PublicKey[] = []
        let optifiMarkets = await findOptifiMarkets(context)
        console.log(`Found ${optifiMarkets.length} optifi markets in total `);
        for (let market of optifiMarkets) {
            // console.log("Market - ", market[0], " address ", formatExplorerAddress(
            //     context, market[1].toString(),
            //     SolanaEntityType.Account)
            // );
            console.log("Instrument address is ", market[0].instrument.toString());
            let instrument = await context.program.account.chain.fetch(market[0].instrument)
            if (instrument.asset == ammInfo.asset) {
                // console.log("instrument: ", instrument.expiryDate.toNumber())
                console.log("instrument: ", instrument)

                optifiMarketsToAdd.push(market[1])
            }
        }

        for (let market of optifiMarketsToAdd) {
            let res = await addInstrumentToAmm(context, ammAddress, market)
            console.log(`successfully added optifi market ${market.toString()} to amm ${ammAddress.toString()} with id ${ammIndex}`)
            console.log(res)
        }
    } catch (err) {
        console.error(err);
    }
}

initializeContext().then((context) => {
    addInstrumentsToAmm(context, ammIndex)
})
