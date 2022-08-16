import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import setDelegation from "../../instructions/user/setDelegation";


let delegatee = new PublicKey("123");

initializeContext().then(async (context) => {
    setDelegation(context, delegatee).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})