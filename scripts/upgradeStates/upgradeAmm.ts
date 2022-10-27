// @ts-ignore
import { initializeContext } from "../../index";
import upgradeAmm from "../../instructions/upgradeStates/upgradeAmm";

let ammIdxs = [2, 3]

initializeContext().then(async (context) => {
    for (let ammIndex of ammIdxs) {
        let res = await upgradeAmm(context, ammIndex)
        console.log(`upgradeAmm for amm index ${ammIndex} res: `, res)
    }
});
