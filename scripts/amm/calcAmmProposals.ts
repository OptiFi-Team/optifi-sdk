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
import calculateAmmProposal from "../../instructions/calculateAmmProposal";

async function calculateAmmProposals(context: Context) {
    try {
        let ammIndex = 3;
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

initializeContext().then((context) => {
    calculateAmmProposals(context)
})
