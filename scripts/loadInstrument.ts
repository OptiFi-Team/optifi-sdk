import {initializeContext} from "../index";
import Context from "../types/context";
import {PublicKey} from "@solana/web3.js";
import {Chain} from "../types/optifi-exchange-types";

let instrumentAddress = new PublicKey("4mCF7sX5bC7amA5DdSQmVEXAz78BiQYPtbvSFMP8rEK2");

initializeContext().then((context) => {
    context.program.account.chain.fetch(instrumentAddress).then((chainRes) => {
        console.log("Chain res is ", chainRes);
        // @ts-ignore
        let chain = chainRes as Chain;
        console.log("Chain is", chain);
    })
})