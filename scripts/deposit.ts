import { initializeContext } from "../index";
import deposit from "../instructions/deposit";

let amount = 1000; // already including decimals

initializeContext().then((context) => {
    deposit(context, amount).then((res) => {
        console.log("Got deposit res", res);
    }).catch((err) => {
        console.error(err);
    })
})