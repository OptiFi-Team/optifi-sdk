import { initializeContext } from "../index";
import { getAmountToReserve, getUserBalance } from "../utils/user";

initializeContext().then(async (context) => {
    let amount_to_reserve = await getAmountToReserve(context);
    let user_balance = await getUserBalance(context);
    let available_balance = user_balance - amount_to_reserve;
    let liquidation = available_balance * 0.9;


    console.log("amount_to_reserve: ", amount_to_reserve);
    console.log("user_balance: ", user_balance);
    console.log("available_balance: ", available_balance);
    console.log("liquidation: ", liquidation);
})