import { initializeContext } from "../index";
import { getAmountToReserve, getUserBalance } from "../utils/user";

initializeContext().then((context) => {
    getAmountToReserve(context).then((res) => {
        console.log("Got AmountToReserve", res);
    }).catch((err) => {
        console.error(err);
    })

    getUserBalance(context).then((res) => {
        console.log("Got Balance", res);
    }).catch((err) => {
        console.error(err);
    })
})