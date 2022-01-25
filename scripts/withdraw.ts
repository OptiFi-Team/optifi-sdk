import { initializeContext } from "../index";
import withdraw from "../instructions/withdraw";

let amount = 100; // already including decimals

initializeContext().then((context) => {
    withdraw(context, amount).then((res) => {
        console.log("Got withdraw res", res);
    }).catch((err) => {
        console.error(err);
    })
})