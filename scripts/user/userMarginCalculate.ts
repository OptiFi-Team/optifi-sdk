import { initializeContext } from "../../index";
import userMarginCalculate from "../../instructions/userMarginCalculate";

initializeContext().then((context) => {
    userMarginCalculate(context).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})