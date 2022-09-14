import { initializeContext } from "../../index";
import liquidateUser from "../../sequences/liquidateUser";
import { getAllUsersOnExchange } from "../../utils/accounts";
import { calcMarginRequirementForUser } from "../../utils/calcMarginRequirementForUser";
import { sleep } from "../../utils/generic";
import Context from "../../types/context";
import { PublicKey } from "@solana/web3.js";
import { getUserBalance } from "../../utils/user";
import { sendNotifiAlert } from "../../utils/notifi";
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
            let [marginRequirement, netOptionValue] = await calcMarginRequirementForUser(context, userToLiquidate);

            // console.log("userToLiquidate: " + userToLiquidate.toString() + ", margin ratio: " + (margin + netOptionValue) / marginRequirement)

            //send notifi alert 
            if (margin + netOptionValue < marginRequirement) {
                console.log("send alert to user " + userAccount.owner.toString() + " via notifi...")
                let userBalance = await getUserBalance(context); // total balance

                let totalOptionValue = netOptionValue;
                let accountEquity = userBalance + totalOptionValue;
                let availableBalance = accountEquity - marginRequirement;
                let liquidation = marginRequirement * 0.9;
                let liquidationBuffer = accountEquity - liquidation;
                let data = {
                    "availableBalance": availableBalance,
                    "accountEquity": accountEquity,
                    "marginRequirement": marginRequirement,
                    "liquidationBuffer": liquidationBuffer,
                }

                await sendNotifiAlert(userAccount.owner.toString(), data)
            }

            if (margin + netOptionValue < marginRequirement * 0.9) {
                console.log("userToLiquidate: " + userToLiquidate.toString() + ", margin: " + margin + ", liquidation: " + marginRequirement * 0.9)
                liquidateUser(context, userToLiquidate)
            }
        }
        await sleep(3000);
    } catch (e) {
        console.log(e);
        await sleep(2 * 60 * 1000);
    }
    await liquidationLoop(context);
}

initializeContext().then((context) => {
    liquidationLoop(context);
})