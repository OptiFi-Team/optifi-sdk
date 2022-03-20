import { initializeContext } from "../index";
import Context from "../types/context";
import { PublicKey } from "@solana/web3.js";
import { UserAccount } from "../types/optifi-exchange-types";
import { findUserAccount } from "../utils/accounts";

let userAccountAddress = new PublicKey("6z8HVptWedAnugg35SM7XMGt7ZQVzExjphBiYvm5RnAZ");

initializeContext().then((context) => {
    findUserAccount(context).then(([userAccountAddress,]) => {
        context.program.account.userAccount.fetch(userAccountAddress).then((res) => {
            // @ts-ignore
            let userAccount = res as UserAccount;
            console.log("userAccount is", userAccount);
        })
    })
})