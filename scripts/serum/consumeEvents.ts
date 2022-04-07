import { consumeEvents } from "../../instructions/serum/consumeEvents"
import { initializeContext } from "../../index";
import { market } from "../constants"
import { PublicKey } from "@solana/web3.js";
import { getSerumMarket } from "../../utils/serum";
import { findUserAccount, findUserUSDCAddress, getDexOpenOrders } from "../../utils/accounts";
import { findAssociatedTokenAccount } from "../../utils/token";
import Context from "../../types/context";


// consume Events for all OpenOrders Accounts on a market
initializeContext().then(async (context) => {
    let optifiMarket = await context.program.account.optifiMarket.fetch(market) // optifi market
    let serumMarket = optifiMarket.serumMarket // serum market address of the optifi market
    let serumMarketInfo = await getSerumMarket(context, serumMarket)

    let [userAccountAddress,] = await findUserAccount(context)
    let [longSPLTokenVault,] = await findAssociatedTokenAccount(
        context,
        optifiMarket.instrumentLongSplToken,
        userAccountAddress
    )
    let coinFeeAccount = longSPLTokenVault
    let [pcFeeAccount,] = await findUserUSDCAddress(context)
    console.log("coinFeeAccount: ", coinFeeAccount.toString())
    console.log("pcFeeAccount: ", pcFeeAccount.toString())


    let openOrdersAccounts = await findAllOpenOrdersForSerumMarket(context, serumMarket,)
    console.log(`found ${openOrdersAccounts.length} open orders accounts`)

    const batchSize = 10;
    for (let i = 0; i < openOrdersAccounts.length; i += batchSize) {
        const openOrdersAccountsToCrank = openOrdersAccounts.slice(i, i + batchSize);
        let res = await consumeEvents(
            context,
            serumMarket,
            openOrdersAccountsToCrank,
            serumMarketInfo.decoded.eventQueue,
            pcFeeAccount,
            coinFeeAccount,
            200
        )
        console.log(res)
    }
})

// consume Events for One OpenOrders Accounts on a market
initializeContext().then(async (context) => {
    let optifiMarket = await context.program.account.optifiMarket.fetch(market) // optifi market
    let serumMarket = optifiMarket.serumMarket // serum market address of the optifi market
    let serumMarketInfo = await getSerumMarket(context, serumMarket)

    let [userAccountAddress,] = await findUserAccount(context)
    let [dexOpenOrders, _bump2] = await getDexOpenOrders(
        context,
        serumMarket,
        userAccountAddress
    );

    let openOrdersAccounts = [dexOpenOrders]

    let [longSPLTokenVault,] = await findAssociatedTokenAccount(
        context,
        optifiMarket.instrumentLongSplToken,
        userAccountAddress
    )
    let coinFeeAccount = longSPLTokenVault
    let [pcFeeAccount,] = await findUserUSDCAddress(context)
    console.log("coinFeeAccount: ", coinFeeAccount.toString())
    console.log("pcFeeAccount: ", pcFeeAccount.toString())

    consumeEvents(
        context,
        serumMarket,
        openOrdersAccounts,
        serumMarketInfo.decoded.eventQueue,
        pcFeeAccount,
        coinFeeAccount,
        20
    ).then(e => {
        console.log(e)
    })
})


async function findAllOpenOrdersForSerumMarket(context: Context, serumMarket: PublicKey) {
    let allUserAccounts = await context.program.account.userAccount.all()
    let res: PublicKey[] = []
    for (let e of allUserAccounts) {
        let [dexOpenOrders,] = await getDexOpenOrders(
            context,
            serumMarket,
            e.publicKey
        )
        res.push(dexOpenOrders)
    }

    return res
}