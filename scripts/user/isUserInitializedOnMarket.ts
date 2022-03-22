import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import { isUserInitializedOnMarket } from "../../utils/market";

let market = new PublicKey("8QwEJLGqebW1hz4SWDDjTVZYUtB4kLk5GmwnYiA7kF2G");

initializeContext().then((context) => {
    isUserInitializedOnMarket(context, market).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})