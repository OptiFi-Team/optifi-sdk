import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import liquidationSettleOrder from "../../instructions/liquidation/liquidationSettleOrder";


let userToLiquidate = new PublicKey("6k1Wxd3qekJfRpEpThyQpNEY4vLtXkwSY9LZ2fTr7JCG");

let marketAddress = new PublicKey("3897gReuHQcfgudgmaFJtNU1q6TTeKJ8tRNsDwKPVwxw");

initializeContext().then(async (context) => {
    liquidationSettleOrder(context, userToLiquidate, marketAddress).then((res) => {
        console.log("Got liquidationSettleOrder res", res);
    }).catch((err) => {
        console.error(err);
    })
})