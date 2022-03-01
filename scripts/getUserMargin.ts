import { initializeContext } from "../index";
import { getAmountToReserve } from "../utils/user";

initializeContext().then((context) => {
    getAmountToReserve(context).then((res) => {
        console.log("Got res", res);
    }).catch((err) => {
        console.error(err);
    })
})