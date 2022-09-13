import { sleep } from "@blockworks-foundation/mango-client";
import { Transaction } from "@solana/web3.js";
import { initializeContext } from "../../index";
import marginStress from "../../instructions/marginStress/marginStress";
import { increaseComputeUnitsIx } from "../../utils/transactions";

let assets = [0, 1, 3];

initializeContext().then(async (context) => {
    while (true) {
        assets.forEach(async asset => {
            let tx = new Transaction()
            tx.add(increaseComputeUnitsIx)
            let inx = await marginStress(context, asset)
            tx.add(...inx)
            let res = await context.provider.sendAndConfirm(tx)
            console.log("res: ", res)
        })
        await sleep(10 * 1000)
    }
})