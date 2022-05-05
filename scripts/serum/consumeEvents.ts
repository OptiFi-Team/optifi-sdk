import { initializeContext } from "../../index";
import { market } from "../constants"
import { findOpenOrdersForSerumMarket, getSerumMarket } from "../../utils/serum";
import { consumeEvents } from "../../instructions/serum/consumeEvents";
import { sleep } from "@project-serum/common";


// consume Events for all OpenOrders Accounts on a market
initializeContext().then(async (context) => {
    let optifiMarket = await context.program.account.optifiMarket.fetch(market) // optifi market
    let serumMarket = optifiMarket.serumMarket // serum market address of the optifi market
    let serumMarketInfo = await getSerumMarket(context, serumMarket)

    let openOrdersAccountsInfo = await findOpenOrdersForSerumMarket(context, serumMarket)
    let openOrdersAccounts = openOrdersAccountsInfo.map(e => e.address)

    console.log(`found ${openOrdersAccounts.length} open orders accounts`)

    const batchSize = 10;
    for (let i = 0; i < openOrdersAccounts.length; i += batchSize) {
        const openOrdersAccountsToCrank = openOrdersAccounts.slice(i, i + batchSize);
        let res = await consumeEvents(
            context,
            serumMarket,
            openOrdersAccountsToCrank,
            serumMarketInfo.decoded.eventQueue,
            65535
        )
        console.log(res)
    }

    await sleep(5000);
    openOrdersAccounts = openOrdersAccounts.reverse()
    for (let i = 0; i < openOrdersAccounts.length; i += batchSize) {
        const openOrdersAccountsToCrank = openOrdersAccounts.slice(i, i + batchSize);
        let res = await consumeEvents(
            context,
            serumMarket,
            openOrdersAccountsToCrank,
            serumMarketInfo.decoded.eventQueue,
            65535
        )
        console.log(res)
    }
})

// consume Events for One OpenOrders Accounts on a market
// initializeContext().then(async (context) => {
//     let optifiMarket = await context.program.account.optifiMarket.fetch(market) // optifi market
//     let serumMarket = optifiMarket.serumMarket // serum market address of the optifi market
//     let serumMarketInfo = await getSerumMarket(context, serumMarket)

//     let event = await serumMarketInfo.loadEventQueue(context.connection);
//     for (let fill of await serumMarketInfo.loadFills(context.connection)) {
//         console.log("fill: ", fill.eventFlags, fill.orderId, fill.price, fill.size, fill.side);
//     }

//     console.log(event);

//     let [userAccountAddress,] = await findUserAccount(context)

//     let [acctExists, userAccount] = await userAccountExists(context)

//     if (acctExists) {

//         let [dexOpenOrders, _bump2] = await getDexOpenOrders(
//             context,
//             serumMarket,
//             userAccountAddress
//         );

//         event.forEach(e => {
//             if (e.openOrders.toString() == dexOpenOrders.toString()) {
//                 console.log("hi")
//                 console.log(e);

//             }
//         })

//         let openOrdersAccounts = [dexOpenOrders]

//         let [longSPLTokenVault,] = await findAssociatedTokenAccount(
//             context,
//             optifiMarket.instrumentLongSplToken,
//             userAccountAddress
//         )
//         let coinFeeAccount = longSPLTokenVault
//         let pcFeeAccount = userAccount!.userMarginAccountUsdc
//         console.log("coinFeeAccount: ", coinFeeAccount.toString())
//         console.log("pcFeeAccount: ", pcFeeAccount.toString())

//         consumeEvents(
//             context,
//             serumMarket,
//             openOrdersAccounts,
//             serumMarketInfo.decoded.eventQueue,
//             65535
//         ).then(e => {
//             console.log(e)
//         })
//     }
// })

