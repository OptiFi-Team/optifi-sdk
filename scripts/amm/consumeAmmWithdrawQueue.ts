import { initializeContext } from "../../index";
import consumeWithdrawRequestQueue from "../../instructions/amm/consumeWithdrawRequestQueue";
import { findOptifiExchange, getUserAccountById } from "../../utils/accounts";
import { findAMMWithIdx } from "../../utils/amm";
// import { ammIndex } from "./constants";
import Context from "../../types/context"
import { SolanaEndpoint } from "../../constants";
import { sleep } from "../../utils/generic";
import * as anchor from "@project-serum/anchor";
import BN from 'bn.js';

let ammIndexes = [1, 2]
initializeContext().then(async (context) => {
    let [optifiExchange,] = await findOptifiExchange(context)
    ammIndexes.forEach(async ammIndex => {
        let [ammAddress,] = await findAMMWithIdx(context, optifiExchange, ammIndex)
        let amm = await context.program.account.ammAccount.fetch(ammAddress)

        while (true) {

            let withdrawRequests = await context.program.account.ammWithdrawRequestQueue.fetch(amm.withdrawQueue)
            console.log(withdrawRequests.requestIdCounter)
            console.log(withdrawRequests.head)
            console.log(withdrawRequests.tail)
            if (withdrawRequests.head != withdrawRequests.tail) {
                // @ts-ignore
                let request = withdrawRequests.requests[withdrawRequests.head]
                console.log(request);
                let userId = request.userAccountId
                let requestAmount = request.amount

                let requestTimestamp = request.requestTimestamp
                // const now = new anchor.BN(Date.now() / 1000);
                // const latestRoundTimestamp: anchor.BN =
                //     aggregator.latestConfirmedRound.roundOpenTimestamp;
                // const staleness = now.sub(latestRoundTimestamp);

                console.log("userId: ", userId)
                console.log("requestTimestamp: ", requestTimestamp)

                console.log("requestAmount: ", requestAmount.toString());
                console.log("requestTimestamp: ", requestTimestamp.toString());

                let userAccount = await getUserAccountById(context, userId)
                console.log("userId: ", userId, " ,userAccount: ", userAccount.publicKey.toString())
                await consumeWithdrawRequestQueue(context, ammAddress, userAccount.publicKey).then((res) => {
                    console.log("Got consumeWithdrawRequestQueue res", res);
                }).catch((err) => {
                    console.error(err);
                })
            }
            await sleep(10 * 1000);
        }
    })
})

function isReqeustInCorrectTimeWindow(context: Context, requestTimestamp: number): boolean {
    let waitingTimeInSeconds
    if (context.endpoint == SolanaEndpoint.Mainnet) {
        waitingTimeInSeconds = 2 * 24 * 60 * 60 // 2 days
    } else if (context.endpoint == SolanaEndpoint.Devnet) {
        waitingTimeInSeconds = 10 * 60 // 10 mins
    }

    let now = new Date().getTime()
    let validWithdrawTime = new Date((requestTimestamp + waitingTimeInSeconds) * 1000).getTime() / 1000
    console.log("now: ", now, ", validWithdrawTime: ", validWithdrawTime)
    if (now >= validWithdrawTime) {
        return true
    } else {
        return false
    }
}