import { initializeContext } from "../index";
import { formatExplorerAddress, SolanaEntityType } from "../utils/debug";
import { findAMMAccounts } from "../utils/amm";
import { getAllOrdersForAccount } from "../utils/orderHistory";
import { findUserAccount } from "../utils/accounts";
import { rejects } from "assert";

import { PublicKey } from "@solana/web3.js";
import { getOrdersOnMarket } from "../utils/orders";

// let market = new PublicKey("EdsJP7dzK3TfBSHbjDwNpXUXupgqkXn8yBvSQHwgm1A7");
let market = new PublicKey("HgRRCp5Dt18GFW8Gc9bp8hvYct37GrXnWzNUEAgetxMS");

initializeContext()
  .then((context) => {
    findUserAccount(context)
      .then(([userAccount, _]) => {
        console.log("start getAllOrdersForAccount");
        getAllOrdersForAccount(context, userAccount)
          .then((res) => {
            console.log("res - getAllOrdersForAccount: ", res);
          })
          .catch((err) => {
            console.log(err);
          });
      })
      .catch((err) => {
        console.error(err);
      });

    // getOrdersOnMarket(context, market).then((orders) => {
    //   for (let order of orders) {
    //     console.log(order);
    //     console.log("order id : ", order.orderId.toString());
    //   }
    // });
  })
  .catch((err) => {
    console.error(err);
  });
