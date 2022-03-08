import { initializeContext } from "../../index";
import marginStressInit from "../../instructions/marginStressInit";
import Asset from "../../types/asset";

let asset = Asset.Bitcoin;

initializeContext().then((context) => {
    marginStressInit(context, asset).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})