import { initializeContext } from "../index";
import initializeSerumMarket from "../instructions/initializeSerumMarket";

initializeContext().then(async (context) => {
    initializeSerumMarket(context, 1).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })

})

