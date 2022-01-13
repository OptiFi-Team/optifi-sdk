import {initializeContext} from "../index";
import deposit from "../instructions/deposit";

initializeContext().then((context) => {
    deposit(context, 10).then((res) => {
        console.log("Got deposit res", res);
    }).catch((err) => {
        console.error(err);
    })
})