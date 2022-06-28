import { PublicKey } from "@solana/web3.js";
import { SWITCHBOARD } from "../../constants";
import { initializeContext } from "../../index";
import addWithdrawRequest from "../../instructions/amm/addWithdrawRequest";
import { AmmAccount } from "../../types/optifi-exchange-types";
import { findOptifiExchange, findUserAccount } from "../../utils/accounts";
import { calcAmmWithdrawFees, findAMMWithIdx, getAmmWithdrawCapacity } from "../../utils/amm";
import { getSwitchboard } from "../../utils/switchboardV2";
import { ammIndex } from "./constants";

const lpAmount = 100; // already including decimals

initializeContext().then(async (context) => {
    let [optifiExchange,] = await findOptifiExchange(context)
    let [ammAddress,] = await findAMMWithIdx(context, optifiExchange, ammIndex)
    let [userAccountAddress] = await findUserAccount(context)
    let userAccount = await context.program.account.userAccount.fetch(userAccountAddress)

    let ammRes = await context.program.account.ammAccount.fetch(ammAddress)
    // @ts-ignore
    let amm = ammRes as AmmAccount;

    // get amm withdraw capacity
    let capacity = getAmmWithdrawCapacity(amm, amm[0].price)
    console.log(capacity)

    // calc amm withdraw fee - note: lpAmount is ui amount
    // @ts-ignore
    let fees = await calcAmmWithdrawFees(context.connection, amm, userAccount as UserAccount, lpAmount,)

    console.log(fees)
    // // add a withdraw request
    addWithdrawRequest(context, ammAddress, amm, lpAmount).then((res) => {
        console.log("Got withdraw res", res);
    }).catch((err) => {
        console.error(err);
    })
})