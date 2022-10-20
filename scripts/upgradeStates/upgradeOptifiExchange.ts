// @ts-ignore
import { initializeContext } from "../../index";
import Context from "../../types/context";
import upgradeOptifiExchange from "../../instructions/upgradeStates/upgradeOptifiExchange";

initializeContext().then(async (context: Context) => {
    let res = await upgradeOptifiExchange(context)
    console.log("upgradeOptifiExchange res: ", res)
})
