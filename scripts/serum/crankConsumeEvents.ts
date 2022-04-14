import { initializeContext } from "../../index";
import { PublicKey } from "@solana/web3.js";
import { getSerumMarket, findOpenOrdersForSerumMarket } from "../../utils/serum";
import { getAllUsersOnExchange, getDexOpenOrders } from "../../utils/accounts";
import Context from "../../types/context";
import { consumeEvents } from "../../instructions/serum/consumeEvents";
import { sleep } from "@project-serum/common";
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
