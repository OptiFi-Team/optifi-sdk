import { initializeContext } from "../index";
import userMarginCalculate from "../instructions/userMarginCalculate";
import { getAmountToReserve, getUserBalance } from "../utils/user";

initializeContext().then(async (context) => {
    let amount_to_reserve = await getAmountToReserve(context);
    let user_balance = await getUserBalance(context); // total balance
    let available_balance = user_balance - amount_to_reserve;

    if (available_balance < 0) {
        available_balance = 0;
    }

    let liquidation = amount_to_reserve * 0.9;
    let liquidation_buffer = user_balance - liquidation;

    console.log("amount_to_reserve: ", amount_to_reserve);
    console.log("user_balance: ", user_balance);
    console.log("available_balance: ", available_balance);
    console.log("liquidation: ", liquidation);
    console.log("liquidation_buffer: ", liquidation_buffer);
})