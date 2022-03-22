import { sleep } from "@project-serum/common";
import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import settleOrderFunds from "../../instructions/settleOrderFunds";
import userMarginCalculate from "../../instructions/userMarginCalculate";

let market = new PublicKey("3qCSVYhpkuJoNnkGtL2ddtt3LzB6B5jyx7EohFkCoZyw");

initializeContext().then(async (context) => {
    console.log("Start settle the markets: ", market.toString());
    let res = await settleOrderFunds(context, [market]);
    if (res) {
        console.log(res);
    }

    await sleep(1000);
    await userMarginCalculate(context);
})