import { initializeContext } from "../../index";
import liquidateUser from "../../sequences/liquidateUser";
import { getAllUsersOnExchange } from "../../utils/accounts";
import { calcMarginRequirementForUser } from "../../utils/calcMarginRequirementForUser";
import { sleep } from "../../utils/generic";
import Context from "../../types/context";
import { PublicKey } from "@solana/web3.js";
import { getUserBalance } from "../../utils/user";
import { notifiMarginCallAlert, notifiLiquidationAlert } from "../../utils/notifi";
import { loadOrdersForOwnerOnAllMarkets } from "../../utils/orders";
import { findOptifiMarketsWithFullData } from "../../utils/market";
import { Order, loadOrdersAccountsForOwnerV2 } from "../../utils/orders"
import { findUserAccount } from "../../utils/accounts";
import { getAllOrdersForAccount } from "../../utils/orderHistory";
import { Position, getUserPositions } from "../../utils/market";


async function getUserOpenOrderAndPosition(context: Context): Promise<[Array<Order>, Array<Position>]> {
    return new Promise(async (resolve, reject) => {
        let optifiMarkets = await findOptifiMarketsWithFullData(context)
        let [userAccount,] = await findUserAccount(context)
        let [userAccountAddress,] = await findUserAccount(context)
        let openOrdersAccount = await loadOrdersAccountsForOwnerV2(context, optifiMarkets, userAccountAddress)
        let context2 = await initializeContext(undefined, undefined, undefined, undefined, undefined, { disableRetryOnRateLimit: true, commitment: "confirmed" })
        let orderHistory = await getAllOrdersForAccount(context2, userAccount, optifiMarkets)
        let orders = await loadOrdersForOwnerOnAllMarkets(optifiMarkets, openOrdersAccount.map(e => e.openOrdersAccount), orderHistory)
        let userPositions = await getUserPositions(context, userAccountAddress)
        resolve([orders, userPositions])
    })
}

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

            console.log("userToLiquidate: " + userToLiquidate.toString() + ", margin ratio: " + (margin + netOptionValue) / marginRequirement)

            let totalOptionValue = netOptionValue;
            let accountEquity: number = margin + totalOptionValue;
            let availableBalance: number = accountEquity - marginRequirement;
            //send notifi alert 
            if (margin + netOptionValue < marginRequirement) {
                console.log("send alert to user " + userAccount.owner.toString() + " via notifi...")

                let liquidation = marginRequirement * 0.9;
                let liquidationBuffer: number = accountEquity - liquidation;
                //add "$" if number
                let availableBalanceStr = (availableBalance < 0) ? "-$" + (-availableBalance).toString() : "$" + availableBalance.toString()
                let accountEquityStr = (accountEquity < 0) ? "-$" + (-accountEquity).toString() : "$" + accountEquity.toString()
                let marginRequirementStr = (marginRequirement < 0) ? "-$" + (-marginRequirement).toString() : "$" + marginRequirement.toString()
                let liquidationBufferStr = (liquidationBuffer < 0) ? "-$" + (-liquidationBuffer).toString() : "$" + liquidationBuffer.toString()

                let data = {
                    "availableBalance": availableBalanceStr,
                    "accountEquity": accountEquityStr,
                    "marginRequirement": marginRequirementStr,
                    "liquidationBuffer": liquidationBufferStr,
                }

                await notifiMarginCallAlert(userAccount.owner.toString(), data)
            }

            if (margin + netOptionValue < marginRequirement * 0.9) {
                let [openOrdersBefore, positionBefore] = await getUserOpenOrderAndPosition(context)
                console.log("userToLiquidate: " + userToLiquidate.toString() + ", margin: " + margin + ", liquidation: " + marginRequirement * 0.9)
                await liquidateUser(context, userToLiquidate)
                let [openOrdersAfter, positionAfter] = await getUserOpenOrderAndPosition(context)
                await notifiLiquidationAlert(context, userAccount.owner.toString(), availableBalance, openOrdersBefore, openOrdersAfter, positionBefore, positionAfter)
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