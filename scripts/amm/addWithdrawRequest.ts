import { getAccount } from "@solana/spl-token";
import Decimal from "decimal.js";
import { USDC_DECIMALS } from "../../constants";
import { initializeContext } from "../../index";
import addWithdrawRequest from "../../instructions/amm/addWithdrawRequest";
import { AmmAccount, UserAccount } from "../../types/optifi-exchange-types";
import { findOptifiExchange, findUserAccount } from "../../utils/accounts";
import { calcAmmWithdrawFees, findAMMWithIdx, getAmmWithdrawCapacity } from "../../utils/amm";
import { findAssociatedTokenAccount } from "../../utils/token";
import { ammIndex } from "./constants";

const lpAmount = 1; // already including decimals

initializeContext().then(async (context) => {
    let [optifiExchange,] = await findOptifiExchange(context)
    let [ammAddress,] = await findAMMWithIdx(context, optifiExchange, ammIndex)
    let [userAccountAddress] = await findUserAccount(context)
    let userAccountRes = await context.program.account.userAccount.fetch(userAccountAddress)
    // @ts-ignore
    let userAccount = userAccountRes as UserAccount;



    let ammRes = await context.program.account.ammAccount.fetch(ammAddress)
    // @ts-ignore
    let amm = ammRes as AmmAccount;

    let [userLpAccount] = await findAssociatedTokenAccount(context, amm.lpTokenMint, userAccountAddress)
    let userLpTokenAccountInfo = await getAccount(context.connection, userLpAccount)
    let userLpTokenBalanceRaw = userLpTokenAccountInfo.amount
    let userLpTokenBalance = new Decimal(userLpTokenBalanceRaw.toString()).div(10 ** USDC_DECIMALS).toNumber()

    console.log("userLpTokenBalance: ", userLpTokenBalance)

    // get amm withdraw capacity
    let capacity = getAmmWithdrawCapacity(amm, amm.price.toNumber() / 10 ** USDC_DECIMALS)
    console.log(capacity)

    // calc amm withdraw fee - note: lpAmount is ui amount
    let fees = await calcAmmWithdrawFees(context.connection, amm, userAccount, lpAmount, userLpTokenBalance)

    console.log(fees)
    // // add a withdraw request
    addWithdrawRequest(context, ammAddress, amm, lpAmount).then((res) => {
        console.log("Got withdraw res", res);
    }).catch((err) => {
        console.error(err);
    })
})