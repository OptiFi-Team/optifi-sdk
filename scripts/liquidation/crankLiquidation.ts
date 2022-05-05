import { publicKey } from "@project-serum/anchor/dist/cjs/utils";
import { PublicKey } from "@solana/web3.js";
import base58 from "bs58";
import { initializeContext } from "../../index";
import liquidateUser from "../../sequences/liquidateUser";
import { UserAccount } from "../../types/optifi-exchange-types";
import { getAllUsersOnExchange } from "../../utils/accounts";
import { calcMarginRequirementForUser } from "../../utils/calcMarginRequirementForUser";
import { sleep } from "../../utils/generic";
import Context from "../../types/context";

const liquidationLoop = async (context: Context) => {
    try {
        let Users = await getAllUsersOnExchange(context);

        console.log("Find ", Users.length, " user on the exchange...");

        for (let user of Users) {

            let userToLiquidate = user.publicKey;

            let userAccount =user.accountInfo;

            let tokenAmount = await context.connection.getTokenAccountBalance(userAccount.userMarginAccountUsdc);

            let margin = tokenAmount.value.uiAmount!;

            // check user's margin requirement for all existing positions
            let marginRequirement = await calcMarginRequirementForUser(context, userToLiquidate);

            if (margin < marginRequirement * 0.9) {
                console.log("userToLiquidate: ", userToLiquidate.toString(), "margin:", margin, "marginRequirement: ", marginRequirement)

                liquidateUser(context, userToLiquidate).then((res) => {
                    console.log("Got liquidateUser res", res);
                }).catch((err) => {
                    console.error(err);
                })
            }
            await sleep(1000);
        }
        await sleep(30000);
    } catch (e) {
        await sleep(600000);
    }
    await liquidationLoop(context);
}

initializeContext().then((context) => {
    liquidationLoop(context);
})