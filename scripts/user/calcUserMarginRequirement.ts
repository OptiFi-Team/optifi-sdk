import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import { OrderSide } from "../../types/optifi-exchange-types";
import { findUserAccount } from "../../utils/accounts";
import { calcMarginRequirementForUser, isMarginSufficientForNewOrder, preCalcMarginForNewOrder } from "../../utils/calcMarginRequirementForUser";

initializeContext().then(async (context) => {

    try {

        // check user's margin requirement for all existing positions
        let res = await calcMarginRequirementForUser(context)
        console.log("calcMarginRequirementForUser res: ", res)

        let marketAddress = new PublicKey("8P79BbNeTgbdqEpyWVjYWu8JveDsncFgJoUQpASebZM9")
        let [userAccount,] = await findUserAccount(context)

        // check if user's margin is sufficient for the comming new order
        let res2 = await isMarginSufficientForNewOrder(context, userAccount, marketAddress, OrderSide.Ask, 2)
        console.log("isMarginSufficientForNewOrder res: ", res2)

        // let res3 = await preCalcMarginForNewOrder(context, userAccount, marketAddress, OrderSide.Ask, 4)
        // console.log(res3)
    } catch (err) {
        console.log(err)
    }
})