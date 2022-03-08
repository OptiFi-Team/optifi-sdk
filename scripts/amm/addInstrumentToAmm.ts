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

async function addInstrumentsToAmm(context: Context) {
    // let i = 1;
    // let duration = Duration.Weekly;
    // let contractSize = 0.01 * 10000; // TBD
    // for (let asset of SUPPORTED_ASSETS) {
    //     console.log("Initializing AMM for asset ", asset);
    //     try {
    //         let res = await initializeAmm(context, asset, i, duration, contractSize);
    //         console.log("Created AMM - ", formatExplorerAddress(context,
    //             res.data as string,
    //             SolanaEntityType.Transaction)
    //         );
    //         i++;
    //     }
    //     catch (e) {
    //         console.error(e);
    //         throw e;
    //     }
    // }

    try {
        let ammIndex = 3;
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
                console.log("instrument: ", instrument.expiryDate.toNumber())
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
    addInstrumentsToAmm(context)
})
