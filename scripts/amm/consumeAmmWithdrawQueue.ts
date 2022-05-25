import { initializeContext } from "../../index";
import consumeWithdrawRequestQueue from "../../instructions/amm/consumeWithdrawRequestQueue";
import { findOptifiExchange, getUserAccountById } from "../../utils/accounts";
import { findAMMWithIdx } from "../../utils/amm";
import { ammIndex } from "./constants";

initializeContext().then(async (context) => {
    let [optifiExchange,] = await findOptifiExchange(context)
    let [ammAddress,] = await findAMMWithIdx(context, optifiExchange, ammIndex)
    let amm = await context.program.account.ammAccount.fetch(ammAddress)

    while (true) {
        let withdrawRequests = await context.program.account.ammWithdrawRequestQueue.fetch(amm.withdrawQueue)

        if (withdrawRequests.head != withdrawRequests.tail) {
            // @ts-ignore
            let userId = withdrawRequests.requests[withdrawRequests.head].userAccountId

            console.log("userId: ", userId)
            let userAccount = await getUserAccountById(context, userId)

            consumeWithdrawRequestQueue(context, ammAddress, userAccount.publicKey).then((res) => {
                console.log("Got deposit res", res);
            }).catch((err) => {
                console.error(err);
            })
        }
    }
})