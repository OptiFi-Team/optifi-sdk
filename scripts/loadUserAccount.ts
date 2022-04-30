import { initializeContext } from "../index";
import Context from "../types/context";
import { PublicKey } from "@solana/web3.js";
import { UserAccount } from "../types/optifi-exchange-types";
import { findUserAccount } from "../utils/accounts";

let userAccountAddress = new PublicKey("2HmuhmAQ74JRhzn2TVKCdfKvpcNvmZn8iTmaB1utfxWo");

initializeContext().then((context) => {
    context.program.account.userAccount.fetch(userAccountAddress).then((res) => {
        // @ts-ignore
        let userAccount = res as UserAccount;
        console.log("userAccount is", userAccount);
        // @ts-ignore
        console.log("userAccount temp pnl amount:", userAccount.tempPnl.amount.toNumber());
        // @ts-ignore
        console.log("userAccount temp pnl epoch:", new Date(userAccount.tempPnl.epoch.toNumber() * 1000));

        console.log("userMarginAccountUsdc is", userAccount.userMarginAccountUsdc.toString());
    })



})