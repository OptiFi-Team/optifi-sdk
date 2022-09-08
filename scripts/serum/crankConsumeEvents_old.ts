import { initializeContext } from "../../index";
import { PublicKey } from "@solana/web3.js";
import { getSerumMarket, findOpenOrdersForSerumMarket } from "../../utils/serum";
import { getAllUsersOnExchange, getDexOpenOrders } from "../../utils/accounts";
import Context from "../../types/context";
import { consumeEvents, consumeEventsV2 } from "../../instructions/serum/consumeEvents";
import { sleep } from "../../utils/generic";
import { findOptifiMarkets } from "../../utils/market";


// consume Events for all OpenOrders Accounts on a market
initializeContext().then((context) => {
    findOptifiMarkets(context).then(async (res) => {
        console.log(`Found ${res.length} optifi markets - `);
        for (let market of res) {
            consumeEventsLoop2(context, market[1])
        }
    })

    process.on('uncaughtException', err => {
        console.log(`Uncaught Exception: ${err.message}`)
        // process.exit(1)
    })
})

const consumeEventsLoop2 = async (context: Context, market: PublicKey) => {

    let optifiMarket = await context.program.account.optifiMarket.fetch(market) // optifi market
    let serumMarket = optifiMarket.serumMarket // serum market address of the optifi market
    let serumMarketInfo = await getSerumMarket(context, serumMarket)

    let event = await serumMarketInfo.loadEventQueue(context.connection);

    let dateTime = new Date()

    console.log(dateTime, market.toString(), " event.length: ", event.length,)

    while (event.length > 0) {

        let openOrders = event.map(e => e.openOrders)

        let uniqueopenOrders: PublicKey[] = []
        openOrders.forEach(e => {
            if (!uniqueopenOrders.map(e => e.toString()).includes(e.toString())) {
                uniqueopenOrders.push(e)
            }
        })


        let res = await consumeEventsV2(
            context,
            serumMarket,
            // [event[0].openOrders],
            // event.slice(0, 20).map(e => e.openOrders),
            uniqueopenOrders.slice(0, 20),
            serumMarketInfo.decoded.eventQueue,
            65535
        )
        console.log(res)
        sleep(20000)
        event = await serumMarketInfo.loadEventQueue(context.connection);

    }
    await sleep(60 * 1000);
    consumeEventsLoop2(context, market);
}


const consumeEventsLoop = async (context: Context, market: PublicKey) => {

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

    await sleep(5000);
    consumeEventsLoop(context, market);
}
