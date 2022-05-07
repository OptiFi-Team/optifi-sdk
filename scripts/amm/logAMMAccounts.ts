import { initializeContext } from "../../index";
import { AmmAccount, AmmState } from "../../types/optifi-exchange-types";
import { findOptifiExchange } from "../../utils/accounts";
import { findAMMAccounts, findAMMWithIdx } from "../../utils/amm";
import { formatExplorerAddress, logFormatted, SolanaEntityType } from "../../utils/debug";
import { ammIndex } from "./constants";

initializeContext().then(async (context) => {
    // findAMMAccounts(context).then((ammAccounts) => {
    //     console.log("Found amm accounts - ", ammAccounts.map((a) => {
    //         logFormatted({
    //             "Address": a[1].toString(),
    //             "Explorer": formatExplorerAddress(context, a[1].toString(), SolanaEntityType.Account),
    //             "Data": a[0],
    //         })
    //     }))
    // })

    let [optifiExchange, _bump1] = await findOptifiExchange(context)
    let [ammAddress, _bump2] = await findAMMWithIdx(context, optifiExchange, ammIndex)

    // @ts-ignore
    let amm = await context.program.account.ammAccount.fetch(ammAddress)
    console.log("amm account info: ", amm)
    console.log("amm.totalLiquidityUsdc: ", amm.totalLiquidityUsdc.toNumber())
    console.log("amm.netDelta: ", amm.netDelta.toNumber())
    console.log(`amm.netDelta:${amm.netDelta.toNumber()}, 
    ui delta: ${((amm.netDelta.toNumber() / 10 ** 6) * amm.price.toNumber()) / amm.totalLiquidityUsdc.toNumber()}`)
    console.log("amm.quoteTokenVault: ", amm.quoteTokenVault.toString())
    console.log("amm.lpTokenMint: ", amm.lpTokenMint.toString())
    if (amm.tradingInstruments.length >= 2) {
        console.log("amm.tradingInstruments: ", amm.tradingInstruments[0].toString())
        console.log("amm.tradingInstruments: ", amm.tradingInstruments[1].toString())
    }
    // @ts-ignore
    amm.proposals.forEach(e => console.log(
        "\n askOrdersSize: ", e.askOrdersSize.map(e => e.toNumber()),
        "\n askOrdersPrice: ", e.askOrdersPrice.map(e => e.toNumber()),
        "\n bidOrdersSize: ", e.bidOrdersSize.map(e => e.toNumber()),
        "\n bidOrdersPrice: ", e.bidOrdersPrice.map(e => e.toNumber()),
        "\n askClientOrderIds: ", e.askClientOrderIds.map(e => e.toNumber()),
        "\n bidClientOrderIds: ", e.bidClientOrderIds.map(e => e.toNumber()),

        "\n prevAskOrdersPrice: ", e.prevAskOrdersPrice.map(e => e.toNumber()),
        "\n prevBidOrdersPrice: ", e.prevBidOrdersPrice.map(e => e.toNumber()),

    )),

        // @ts-ignore
        amm.positions.forEach(e => console.log(
            "latestPosition: ", e.latestPosition.toNumber(),
            "usdcBalance: ", e.usdcBalance.toNumber()
        ))
    console.log("amm.price: ", amm.price.toNumber())


    let ammWithdrawRequestQueue = await context.program.account.ammWithdrawRequestQueue.fetch(amm.withdrawQueue)
    console.log("ammWithdrawRequestQueue.head: ", ammWithdrawRequestQueue.head)
    console.log("ammWithdrawRequestQueue.tail: ", ammWithdrawRequestQueue.tail)
    // @ts-ignore
    console.log("ammWithdrawRequestQueue.tail: ", ammWithdrawRequestQueue.requests.map(e => {
        return {
        "userAccountId": e.userAccountId.toNumber(),
        "amount": e.amount.toNumber(),
        "withdrawTimestamp": e.withdrawTimestamp.toNumber(),
    }}))

})