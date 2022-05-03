import { USDC_DECIMALS } from "../../constants";
import { initializeContext } from "../../index";
import { MarketMakerAccount } from "../../types/optifi-exchange-types";
import { findMarketMakerAccount } from "../../utils/accounts";

initializeContext().then((context) => {
    findMarketMakerAccount(context).then(async ([address]) => {

        let res = await context.program.account.marketMakerAccount.fetch(address);

        let marketMakerAccount = res as MarketMakerAccount;

        let openOrdersData = marketMakerAccount.openOrdersData

        console.log(openOrdersData)

        // @ts-ignore
        for (let openOrders of openOrdersData) {

            console.log(openOrders)

            console.log("penalty:" + openOrders.penalty.toString() / (10 ** USDC_DECIMALS))

        }
    })
})
