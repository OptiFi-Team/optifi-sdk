import { TransactionSignature } from "@solana/web3.js";
import { initializeContext } from "../../index";
import { OrderSide } from "../../types/optifi-exchange-types";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";
import { watchSettleSerumFunds } from "../../utils/serum";
import cancelOrderByClientOrderId from "../../instructions/order/cancelOrder";
import { sleep } from "../../utils/generic";
import * as anchor from "@project-serum/anchor";
import { market } from "../constants"
import { findUserAccount } from "../../utils/accounts";

let clientOrderId = new anchor.BN(9);

// If buy -> Bid, sell -> ask
let side = OrderSide.Bid;


// I think there should be somewhere to save the open orders for user, and
// the user can click button to cancel it. (refer to getOrderOnMarket)

initializeContext().then(async (context) => {
    let [userAccountAddress, _] = await findUserAccount(context);
    let res = await context.program.account.userAccount.fetch(userAccountAddress);
    // @ts-ignore
    let userAccount = res as UserAccount;

    cancelOrderByClientOrderId(context, userAccount, market, side, clientOrderId).then(async (res) => {
        console.log("Cancel order ", res);
        if (res.successful) {
            console.log(formatExplorerAddress(context, res.data as TransactionSignature, SolanaEntityType.Transaction));
            sleep(5000);
            await watchSettleSerumFunds(context, market).then((res) => {
                console.log("Got res!");
            }).catch((err) => {
                console.error(err);
            });
        } else {
            console.error(res);
        }

    }).catch((err) => {
        console.error(err)
    })


});