import { SolanaCluster } from "../constants";
import { initializeContext } from "../index";
import { Exchange } from "../types/optifi-exchange-types";
import { findOptifiExchange, getAllUsersOnExchange } from "../utils/accounts";


initializeContext().then(async (context) => {
    let [exchangeAddress, _] = await findOptifiExchange(context)
    console.log("exchangeAddress: ", exchangeAddress.toString())
    let res = await context.program.account.exchange.fetch(exchangeAddress)

    let optifiExchange = res as Exchange;
    console.log("Got Optifi Exchange ", optifiExchange);

    console.log("Got deliveryFee ", optifiExchange.deliveryFee.toString());
    let common = optifiExchange.instrumentCommon;
    console.log("Got instrument groups ", common);
    // @ts-ignore
    common.forEach(e => {
        console.log("expiry date in group: ", new Date(e.expiryDate.toNumber() * 1000))
    });

    console.log("Got instrument uniques ", optifiExchange.instrumentUnique);
    // @ts-ignore
    optifiExchange.instrumentUnique[0].forEach(e => {
        console.log("put and call option: ", e.strike, e.instrumentPubkeys.map(e => e.toString()))
    });
    console.log("usdcCentralPool: ", optifiExchange.usdcCentralPool.toString());
    console.log("usdcFeePool: ", optifiExchange.usdcFeePool.toString());
    console.log("exchangeAuthority: ", optifiExchange.exchangeAuthority.toString());
    console.log("ivAuthority: ", optifiExchange.ivAuthority.toString());

    let a = await getAllUsersOnExchange(context)
    console.log(`\n OMG, Found ${a.length} users on OptiFi Exchange!!!`)

})