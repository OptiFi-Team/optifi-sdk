import { initializeContext } from "../index";
import Context from "../types/context";
import { PublicKey } from "@solana/web3.js";
import { UserAccount } from "../types/optifi-exchange-types";
import { findUserAccount } from "../utils/accounts";

let userAccountAddress = new PublicKey("6k1Wxd3qekJfRpEpThyQpNEY4vLtXkwSY9LZ2fTr7JCG");

initializeContext().then((context) => {
    context.program.account.userAccount.fetch(userAccountAddress).then((res) => {
        // @ts-ignore
        let userAccount = res as UserAccount;
        console.log("userAccount is", userAccount);
        console.log("userMarginAccountUsdc is", userAccount.userMarginAccountUsdc.toString());
    })

})