// @ts-ignore
import { initializeContext } from "../../index";
import Context from "../../types/context";
import { upgradeOptifiExchangeV1ToV2, upgradeOptifiExchangeV2ToV3, } from "../../instructions/upgradeStates/upgradeOptifiExchange";

initializeContext().then(async (context: Context) => {
    let res = await upgradeOptifiExchangeV2ToV3(context)
    console.log("upgradeOptifiExchange res: ", res)
})
