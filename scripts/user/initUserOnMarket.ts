import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import initUserOnOptifiMarket from "../../instructions/initUserOnOptifiMarket";
import { market } from "../constants"
import { findUserAccount } from "../../utils/accounts";
//let market = new PublicKey("GHtSNAhYsgPUcg4ZTPjp5g4ttq2cqaJBvt7YiHEVqbwb");

initializeContext().then(async (context) => {
    let [userAccountAddress, _] = await findUserAccount(context);
    let res = await context.program.account.userAccount.fetch(userAccountAddress);
    // @ts-ignore
    let userAccount = res as UserAccount;
    initUserOnOptifiMarket(context, market, userAccount).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})