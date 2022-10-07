import { TransactionSignature } from "@solana/web3.js";
import { initializeContext } from "../../index";
import placeOrder from "../../instructions/order/placeOrder";
import { OrderSide } from "../../types/optifi-exchange-types";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";
import { findUserAccount } from "../../utils/accounts";
import { market } from "../constants";
import OrderType from "../../types/OrderType";

let price = 2000;
let size = 1;
let side = OrderSide.Bid;
let orderType = OrderType.Limit;

initializeContext().then(async (context) => {
  let [userAccountAddress, _] = await findUserAccount(context);
  let res = await context.program.account.userAccount.fetch(userAccountAddress);
  // @ts-ignore
  let userAccount = res as UserAccount;
  placeOrder(context, userAccount, market, side, price, size, orderType)
    .then(async (res) => {
      console.log("Placed order ", res);
      if (res.successful) {
        console.log(formatExplorerAddress(context, res.data as TransactionSignature, SolanaEntityType.Transaction));
      } else {
        console.error(res);
      }
    })
    .catch((err) => {
      console.error(err);
    });
});
