import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../index";
import withdrawUsdcFeePool from "../instructions/withdrawUsdcFeePool";

// Do not withdraw all the money, leave some for fee rebate (about 10%)
let amount = 1;

// should be USDC token account
let withdrawDest = new PublicKey("DQRZmPBqRRySEgefwRxGK5PDAU6DMuWsDX9BwsF9Q1oT");

initializeContext().then((context) => {
    withdrawUsdcFeePool(context, amount, withdrawDest).then(res => console.log(res))
})