import {initializeContext} from "../index";
import initUserOnAllMarkets from "../sequences/initUserOnAllMarkets";

initializeContext().then((context) => {
    initUserOnAllMarkets(context)
        .then(() => console.log("Initialized user on all markets"))
        .catch((e) => console.error(e))
})