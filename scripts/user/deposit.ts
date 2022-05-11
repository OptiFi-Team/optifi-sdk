import { initializeContext } from "../../index";
import deposit from "../../instructions/deposit";
import { findUserAccount } from "../../utils/accounts";
let amount = 3000; // already including decimals

initializeContext().then(async(context) => {
    let [userAccountAddress, _] = await findUserAccount(context);
    let res = await context.program.account.userAccount.fetch(userAccountAddress);
    // @ts-ignore
    let userAccount = res as UserAccount;
    deposit(context, amount,userAccount).then((res) => {
        console.log("Got deposit res", res);
    }).catch((err) => {
        console.error(err);
    })
})