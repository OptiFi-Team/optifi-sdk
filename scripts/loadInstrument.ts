import { initializeContext } from "../index";
import Context from "../types/context";
import { PublicKey } from "@solana/web3.js";
import { Chain } from "../types/optifi-exchange-types";

let instrumentAddress = new PublicKey("CRMmuwNbE6TjLfWYmtuAsecjHVrAeuQyWRGsYQ6zcAES");

initializeContext().then((context) => {
    context.program.account.chain.fetch(instrumentAddress).then((chainRes) => {
        console.log("Chain res is ", chainRes);
        // @ts-ignore
        let chain = chainRes as Chain;
        console.log("Chain is", chain);
    })
})