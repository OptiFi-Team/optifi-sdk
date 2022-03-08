import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import ammWithdraw from "../../instructions/ammWithdraw";
import { getAllUsersTxsOnAllAMM, getUserEquity, getUserTxsOnAllAMM } from "../../utils/amm";

let amount = 100; // already including decimals

let ammAddress = new PublicKey("3i7QPGnhG9tHVdcYgr7xsMM6EwQvDYo2iW2HF1zvCxFg");

initializeContext().then(async (context) => {
    await getAllUsersTxsOnAllAMM(context).then((res) => {
        console.log("getAllUsersTxsOnAllAMM res", res);
    }).catch((err) => {
        console.error(err);
    })


    await getUserTxsOnAllAMM(context).then((res) => {
        console.log("getAllUsersTxsOnAllAMM res", res);
    }).catch((err) => {
        console.error(err);
    })


    await getUserEquity(context).then((res) => {
        console.log("getUserEquity res", res);
    }).catch((err) => {
        console.error(err);
    })

})