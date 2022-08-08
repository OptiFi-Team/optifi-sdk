// @ts-ignore
import { initializeContext } from "../../index";
import Context from "../../types/context";
import { getTotalSupply } from "../../utils/market";


initializeContext().then(async (context: Context) => {

    let totalSupply = await getTotalSupply(context);

    console.log(totalSupply)

})