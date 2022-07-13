import { initializeContext } from "../../index";
import consumeWithdrawRequestQueue from "../../instructions/amm/consumeWithdrawRequestQueue";
import { findOptifiExchange, getUserAccountById } from "../../utils/accounts";
import { findAMMWithIdx, getAmmWithdrawQueue } from "../../utils/amm";
import Context from "../../types/context"
import { SolanaEndpoint } from "../../constants";
import { sleep } from "../../utils/generic";

let ammIndexes = [1, 2]
initializeContext().then(async (context) => {
    let [optifiExchange,] = await findOptifiExchange(context)
    ammIndexes.forEach(async ammIndex => {
        let [ammAddress,] = await findAMMWithIdx(context, optifiExchange, ammIndex)
        let amm = await context.program.account.ammAccount.fetch(ammAddress)

        console.log("amm.withdrawQueue: ", amm.withdrawQueue.toString());

        while (true) {
            let ammWithdrawRequestQueue = await getAmmWithdrawQueue(context, amm.withdrawQueue)
            // console.log("decoded ammWithdrawRequestQueue: ", ammWithdrawRequestQueue)

            // console.log(ammWithdrawRequestQueue.requestIdCounter)
            // console.log(ammWithdrawRequestQueue.head)
            // console.log(ammWithdrawRequestQueue.tail)
            if (ammWithdrawRequestQueue.head != ammWithdrawRequestQueue.tail) {
                // @ts-ignore
                let request = ammWithdrawRequestQueue.requests[ammWithdrawRequestQueue.head]
                // console.log(request);
                let userId = request.userAccountId
                let requestAmount = request.amount

                let requestTimestamp = request.requestTimestamp
                // const now = new anchor.BN(Date.now() / 1000);
                // const latestRoundTimestamp: anchor.BN =
                //     aggregator.latestConfirmedRound.roundOpenTimestamp;
                // const staleness = now.sub(latestRoundTimestamp);

                // console.log("userId: ", userId)
                // console.log("requestTimestamp: ", requestTimestamp)

                // console.log("requestAmount: ", requestAmount.toNumber());
                // console.log("requestTimestamp: ", requestTimestamp.toNumber());

                if (isReqeustInCorrectTimeWindow(context, requestTimestamp.toNumber())) {
                    let userAccount = await getUserAccountById(context, userId)
                    console.log("userId: ", userId, " ,userAccount: ", userAccount.publicKey.toString())
                    await consumeWithdrawRequestQueue(context, ammAddress, userAccount.publicKey).then((res) => {
                        console.log("Got consumeWithdrawRequestQueue res", res);
                    }).catch((err) => {
                        console.error(err);
                    })
                }
            }
            await sleep(5 * 60 * 1000);
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
    let validWithdrawTime = new Date((requestTimestamp + waitingTimeInSeconds) * 1000).getTime()
    console.log("now: ", now, ", validWithdrawTime: ", validWithdrawTime)
    if (now >= validWithdrawTime) {
        return true
    } else {
        return false
    }
}