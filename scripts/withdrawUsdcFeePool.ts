import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../index";
import withdrawUsdcFeePool from "../instructions/withdrawUsdcFeePool";

let amount = 1;

let withdrawDest = new PublicKey("HwLPYHdoGvBTHH14SNND1H6weoPSJieQJKQtY6JYScuN");

initializeContext().then((context) => {
    withdrawUsdcFeePool(context, amount, withdrawDest).then(res => console.log(res))
})