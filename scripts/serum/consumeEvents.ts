import { consumeEvents } from "../../instructions/serum/consumeEvents"
import { initializeContext } from "../../index";
import { market } from "../constants"
import { PublicKey } from "@solana/web3.js";
import { getSerumMarket } from "../../utils/serum";
import { findUserAccount, findUserUSDCAddress, getDexOpenOrders } from "../../utils/accounts";
import { findAssociatedTokenAccount } from "../../utils/token";

// let openOrdersAccounts: PublicKey[] = [new PublicKey("")]
// let pcFeeAccount: PublicKey
// let coinFeeAccount: PublicKey

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
        200
    ).then(e => {
        console.log(e)
    })
})
