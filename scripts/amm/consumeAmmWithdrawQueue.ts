import { initializeContext } from "../../index";
import consumeWithdrawRequestQueue from "../../instructions/amm/consumeWithdrawRequestQueue";
import { findOptifiExchange, getUserAccountById } from "../../utils/accounts";
import { findAMMWithIdx } from "../../utils/amm";
// import { ammIndex } from "./constants";
import Context from "../../types/context"
import { SolanaEndpoint } from "../../constants";

let ammIndexes = [1, 2]
initializeContext().then(async (context) => {
    let [optifiExchange,] = await findOptifiExchange(context)
    ammIndexes.forEach(async ammIndex => {
        let [ammAddress,] = await findAMMWithIdx(context, optifiExchange, ammIndex)
        let amm = await context.program.account.ammAccount.fetch(ammAddress)

        while (true) {

            let withdrawRequests = await context.program.account.ammWithdrawRequestQueue.fetch(amm.withdrawQueue)

            if (withdrawRequests.head != withdrawRequests.tail) {
                // @ts-ignore
                let userId = withdrawRequests.requests[withdrawRequests.head].userAccountId
                // @ts-ignore
                let requestTimestamp = withdrawRequests.requests[withdrawRequests.head].requestTimestamp.toNumber()
                if (isReqeustInCorrectTimeWindow(context, requestTimestamp)) {
                    let userAccount = await getUserAccountById(context, userId)

                    await consumeWithdrawRequestQueue(context, ammAddress, userAccount.publicKey).then((res) => {
                        console.log("Got consumeWithdrawRequestQueue res", res);
                    }).catch((err) => {
                        console.error(err);
                    })
                }
            }
        }
    })
})

function isReqeustInCorrectTimeWindow(context: Context, requestTimestamp: number): boolean {
    let waitingTimeInSeconds
    if (context.endpoint == SolanaEndpoint.Mainnet) {
        waitingTimeInSeconds = 2 * 24 * 60 * 60 // 2 days
    } else if (context.endpoint == SolanaEndpoint.Devnet) {
        waitingTimeInSeconds = 10 * 60 // 10 mins
        console.log("hi")
    }

    let now = new Date().getTime()
    let validWithdrawTime = new Date((requestTimestamp + waitingTimeInSeconds) * 1000).getTime()
    console.log(now, validWithdrawTime)
    if (now >= validWithdrawTime) {
        return true
    } else {
        return false
    }
}