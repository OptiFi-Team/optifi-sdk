import { initializeContext } from "../../index";
import marginStressCalculate from "../../instructions/marginStressCalculate";
import Asset from "../../types/asset";

let asset = Asset.Bitcoin;

initializeContext().then((context) => {
    marginStressCalculate(context, asset).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})