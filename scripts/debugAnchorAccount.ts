// A script to use utils/debug/debugAnchorAccount

import {PublicKey} from "@solana/web3.js";
import {initializeContext} from "../index";
import {debugAnchorAccount} from "../utils/debug";

let account = new PublicKey("B8orV3iNBMjMdXi44hf75EUz5EkBdSgUAhjUo2oVmwmX");
initializeContext().then((context) => {
    // @ts-ignore
    let ammAcct = context.program.account.ammAccount._idlAccount;
    console.log(typeof(ammAcct));
    // @ts-ignore
    debugAnchorAccount(context, account, ammAcct)
})