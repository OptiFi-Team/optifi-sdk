import { initializeContext } from "../../index";
import { PublicKey } from "@solana/web3.js";
import { getSerumMarket, findOpenOrdersForSerumMarket } from "../../utils/serum";
import { getAllUsersOnExchange, getDexOpenOrders } from "../../utils/accounts";
import Context from "../../types/context";
import { consumeEvents, consumeEventsQPermissioned, consumeEventsV2 } from "../../instructions/serum/consumeEvents";
import { sleep } from "../../utils/generic";
import { findOptifiMarkets } from "../../utils/market";


// consume Events for all OpenOrders Accounts on a market
initializeContext().then((context) => {
    findOptifiMarkets(context).then(async (res) => {
        console.log(`Found ${res.length} optifi markets - `);
        for (let market of res) {
            consumeEventsLoop(context, market[1])
        }
    })
})

const consumeEventsLoop = async (context: Context, market: PublicKey) => {

    let optifiMarket = await context.program.account.optifiMarket.fetch(market) // optifi market
    let serumMarket = optifiMarket.serumMarket // serum market address of the optifi market
    let serumMarketInfo = await getSerumMarket(context, serumMarket)

    let event = await serumMarketInfo.loadEventQueue(context.connection);

    let dateTime = new Date()

    console.log(dateTime, market.toString(), " event.length: ", event.length, event)

    while (event.length > 0) {

        let openOrders = event.map(e => e.openOrders)

        let uniqueopenOrders: PublicKey[] = []
        openOrders.forEach(e => {
            if (!uniqueopenOrders.map(e => e.toString()).includes(e.toString())) {
                uniqueopenOrders.push(e)
            }
        })


        let res = await consumeEventsQPermissioned(
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
    consumeEventsLoop(context, market);
}

