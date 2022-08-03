import { initializeContext } from "../index";
import userMarginCalculate from "../instructions/userMarginCalculate";
import { findUserAccount } from "../utils/accounts";
import { calcMarginRequirementForUser } from "../utils/calcMarginRequirementForUser";
import { getAmountToReserve, getUserBalance } from "../utils/user";

initializeContext().then(async (context) => {

    let [userAccountAddress, _] = await findUserAccount(context)
    let [marginRequirement, netOptionValue] = await calcMarginRequirementForUser(context, userAccountAddress);
    let user_balance = await getUserBalance(context); // total balance
    let available_balance = user_balance - marginRequirement;

    if (available_balance < 0) {
        available_balance = 0;
    }

    let liquidation = marginRequirement * 0.9;
    let liquidation_buffer = user_balance - liquidation;

    console.log("marginRequirement: ", marginRequirement);
    console.log("netOptionValue: ", netOptionValue);
    console.log("user_balance: ", user_balance);
    console.log("available_balance: ", available_balance);
    console.log("liquidation: ", liquidation);
    console.log("liquidation_buffer: ", liquidation_buffer);
})