import { initializeContext } from "../../index";
import withdraw from "../../instructions/withdraw";
import { findUserAccount } from "../../utils/accounts";
let amount = 1000; // already including decimals

initializeContext().then(async (context) => {
    let [userAccountAddress, _] = await findUserAccount(context);
    let res = await context.program.account.userAccount.fetch(userAccountAddress);
    // @ts-ignore
    let userAccount = res as UserAccount;
    withdraw(context, amount, userAccount).then((res) => {
        console.log("Got withdraw res", res);
    }).catch((err) => {
        console.error(err);
    })
})