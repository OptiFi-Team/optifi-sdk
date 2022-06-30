import { initializeContext } from "../index";
import Context from "../types/context";
import { PublicKey } from "@solana/web3.js";
import { UserAccount } from "../types/optifi-exchange-types";
import { findUserAccount } from "../utils/accounts";

// let userAccountAddress = new PublicKey("2HmuhmAQ74JRhzn2TVKCdfKvpcNvmZn8iTmaB1utfxWo");

initializeContext().then(async (context) => {
    let [userAccountAddress, _] = await findUserAccount(context);

    context.program.account.userAccount.fetch(userAccountAddress).then((res) => {
        // @ts-ignore
        let userAccount = res as UserAccount;
        console.log("userAccount is", res);

        // @ts-ignore
        console.log("userAccount id: ", userAccount.id.toNumber());

        // @ts-ignore
        console.log("userAccount.ammEquities[0].lpAmountInQueue:", userAccount.ammEquities[0].lpAmountInQueue.toNumber());

        // @ts-ignore
        console.log("userAccount temp pnl amount:", userAccount.tempPnl.amount.toNumber());
        // @ts-ignore
        console.log("userAccount temp pnl epoch:", new Date(userAccount.tempPnl.epoch.toNumber() * 1000));

        console.log("userMarginAccountUsdc is", userAccount.userMarginAccountUsdc.toString());
    })



})