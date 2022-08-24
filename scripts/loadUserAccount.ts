import { initializeContext } from "../index";
import Context from "../types/context";
import { PublicKey } from "@solana/web3.js";
import { FeeAccount, UserAccount } from "../types/optifi-exchange-types";
import { findUserAccount } from "../utils/accounts";
import { USDC_DECIMALS } from "../constants";

// let userAccountAddress = new PublicKey("2HmuhmAQ74JRhzn2TVKCdfKvpcNvmZn8iTmaB1utfxWo");

initializeContext().then(async (context) => {
    let [userAccountAddress, _] = await findUserAccount(context);

    console.log("userAccountAddress: ", userAccountAddress.toString())
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

        console.log("userAccount.feeAccount is", userAccount.feeAccount.toString());


        context.program.account.feeAccount.fetch(userAccount.feeAccount).then((res) => {
            // @ts-ignore
            let feeAccount = res as FeeAccount;

            console.log("feeAccount.userAccount: ", feeAccount.userAccount.toString())

            console.log("notionalTradingVolume :", feeAccount.notionalTradingVolume.toNumber() / 10 ** USDC_DECIMALS);

            console.log("notionalTradingVolume :", feeAccount.accFee.toNumber() / 10 ** USDC_DECIMALS);

            console.log("openOrderFee :", feeAccount.openOrderFee);

        })
    })

})