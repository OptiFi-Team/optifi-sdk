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
import calculateAmmDelta from "../../instructions/calculateAmmDelta";

async function syncAmmPositions(context: Context) {
    try {
        let ammIndex = 1;
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

initializeContext().then((context) => {
    syncAmmPositions(context)
})
