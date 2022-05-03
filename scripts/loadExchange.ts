import { initializeContext } from "../index";
import { Exchange } from "../types/optifi-exchange-types";
import { findOptifiExchange, getAllUsersOnExchange } from "../utils/accounts";


initializeContext().then(async (context) => {
    let [exchangeAddress, _] = await findOptifiExchange(context)
    console.log("exchangeAddress: ", exchangeAddress.toString())
    let res = await context.program.account.exchange.fetch(exchangeAddress)

    let optifiExchange = res as Exchange;
    console.log("Got Optifi Exchange ", optifiExchange);

    let common = optifiExchange.instrumentCommon;
    console.log("Got instrument groups ", common);
    console.log("Got instrument uniques ", optifiExchange.instrumentUnique);
    console.log("usdcFeePool: ", optifiExchange.usdcFeePool.toString());
    console.log("exchangeAuthority: ", optifiExchange.exchangeAuthority.toString());

    let a = await getAllUsersOnExchange(context)
    console.log(`\n OMG, Found ${a.length} users on OptiFi Exchange!!!`)

})