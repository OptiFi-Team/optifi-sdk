import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import Asset from "../../types/asset";
import { AmmState, MarginStressState } from "../../types/optifi-exchange-types";
import { findExchangeAccount, findOptifiExchange } from "../../utils/accounts";
import { findAMMAccounts, findAMMWithIdx } from "../../utils/amm";
import { sleep } from "../../utils/generic";
import { syncAmmPositions, calcAmmDelta, calculateAmmProposals, executeAmmOrderProposal, updateAmmFutureOrders, syncAmmFuturePositions } from "./utils";
import Context from "../../types/context";

let ammIdxs = [1, 2]

// all amm states
let Sync = Object.keys(AmmState.Sync)[0].toLowerCase();
let CalculateDelta = Object.keys(AmmState.CalculateDelta)[0].toLowerCase();
let CalculateProposal = Object.keys(AmmState.CalculateProposal)[0].toLowerCase();
let Execute = Object.keys(AmmState.Execute)[0].toLowerCase();

const ammLoop = async (context: Context, optifiExchange: PublicKey, idx: number) => {
    let [ammAddress,] = await findAMMWithIdx(context, optifiExchange, idx)
    // ammAddresses.push(ammAddress)
    let ammAccountInfo = await context.program.account.ammAccount.fetch(ammAddress)
    let state = Object.keys(ammAccountInfo.state)[0].toLowerCase();
    let dateTime = new Date()
    console.log(dateTime, " found AMM State : ", state);

    while (true) {
        try {
            switch (state) {
                case Sync:
                    await syncAmmPositions(context, idx);
                    await syncAmmFuturePositions(context, idx);
                    break;
                case CalculateDelta:
                    await calcAmmDelta(context, idx);
                    let ammAccountInfo = await context.program.account.ammAccount.fetch(ammAddress);
                    if (ammAccountInfo.isHedgeNeeded || ammAccountInfo.isHedgeInProgress) {
                        await updateAmmFutureOrders(context, idx)
                    }
                    break;
                case CalculateProposal:
                    await calculateAmmProposals(context, idx);
                    break;
                case Execute:
                    await executeAmmOrderProposal(context, idx);
                    break;
                default:
                    console.log("unknown state: ", state)
                    break;
                // throw new Error("unkown amm state!")
            }

            await sleep(5000);

        } catch (e) {
            // sleep and skip error
            await sleep(10000);
        }
    }
}


initializeContext().then(async (context) => {
    let [optifiExchange, _bump1] = await findOptifiExchange(context)
    // let ammAddresses: PublicKey[] = []
    // let idx = ammIdxs[0]

    ammIdxs.forEach(idx => ammLoop(context, optifiExchange, idx))

    process.on('uncaughtException', err => {
        console.log(`Uncaught Exception: ${err.message}`)
        // process.exit(1)
    })
})