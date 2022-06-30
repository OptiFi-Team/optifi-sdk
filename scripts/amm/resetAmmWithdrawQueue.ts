import { initializeContext } from "../../index";
import { findOptifiExchange, findUserAccount, getAllUsersOnExchange } from "../../utils/accounts";
import { findAMMWithIdx } from "../../utils/amm";
import resetAmmWithdrawQueue from "../../instructions/authority/resetAmmWithdrawQueue";
import { PublicKey } from "@solana/web3.js";

let ammIndexes = [1, 2]
initializeContext().then(async (context) => {
    let [optifiExchange,] = await findOptifiExchange(context)
    ammIndexes.forEach(async ammIndex => {
        let [ammAddress,] = await findAMMWithIdx(context, optifiExchange, ammIndex)

        // let Users = await getAllUsersOnExchange(context);

        // for (let user of Users) {

        //     let sum = 0;

        //     // @ts-ignore
        //     user.accountInfo.ammEquities.forEach((element) => {
        //         sum += element.lpAmountInQueue.toNumber();
        //     });

        //     if (sum > 0) {
        //         console.log(user.publicKey.toString())
        //         let res = await resetAmmWithdrawQueue(context, ammAddress, user.publicKey)
        //         console.log(res)
        //     }
        // }

        let userAccount = new PublicKey("A7qL6NgxW4WfwX3pJgSswGtGLpTFMrc7szZtkKHuMpTy")
        console.log(userAccount.toString())
        let res = await resetAmmWithdrawQueue(context, ammAddress, userAccount)
        console.log(res)
    })
})
