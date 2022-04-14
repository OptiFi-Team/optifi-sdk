import { initializeContext } from "../../index";
import userMarginCalculate from "../../instructions/userMarginCalculate";
import Asset from "../../types/asset";

initializeContext().then((context) => {
    userMarginCalculate(context).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})