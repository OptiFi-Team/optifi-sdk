import { initializeContext } from "../../index";
import liquidateUser from "../../sequences/liquidateUser";
import { getAllUsersOnExchange } from "../../utils/accounts";
import { calcMarginRequirementForUser } from "../../utils/calcMarginRequirementForUser";
import { sleep } from "../../utils/generic";
import Context from "../../types/context";
import { PublicKey } from "@solana/web3.js";

const liquidationLoop = async (context: Context) => {
    try {
        let Users = await getAllUsersOnExchange(context);

        let dateTime = new Date()

        console.log(dateTime, "find ", Users.length, " user on the exchange...");

        for (let user of Users) {

            // console.log(user)

            let userToLiquidate = user.publicKey;

            // console.log(userToLiquidate.toString());

            let userAccount = user.accountInfo!;

            let tokenAmount = await context.connection.getTokenAccountBalance(userAccount.userMarginAccountUsdc);

            let margin = tokenAmount.value.uiAmount!;

            // check user's margin requirement for all existing positions
            let marginRequirement = await calcMarginRequirementForUser(context, userToLiquidate);

            // console.log("userToLiquidate: " + userToLiquidate.toString() + ", margin ratio: " + margin / marginRequirement)

            if (margin < marginRequirement * 0.9) {
                console.log("userToLiquidate: " + userToLiquidate.toString() + ", margin: " + margin + ", liquidation: " + marginRequirement * 0.9)

                liquidateUser(context, userToLiquidate)
            }
        }
        await sleep(30000);
    } catch (e) {
        console.log(e);
        await sleep(600000);
    }
    await liquidationLoop(context);
}

initializeContext().then((context) => {
    liquidationLoop(context);
})