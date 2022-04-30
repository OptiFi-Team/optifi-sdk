import { initializeContext } from "../index";
import { formatExplorerAddress, SolanaEntityType } from "../utils/debug";
import { findAMMAccounts } from "../utils/amm";
import { getAllOrdersForAccount } from "../utils/orderHistory";
import { findUserAccount } from "../utils/accounts";
import { rejects } from "assert";

import { PublicKey } from "@solana/web3.js";
import { getOrdersOnMarket } from "../utils/orders";

// let market = new PublicKey("EdsJP7dzK3TfBSHbjDwNpXUXupgqkXn8yBvSQHwgm1A7");
let market = new PublicKey("5QCyCgJb6W1wzdtFN53RKpDmuVRoJuGrsh4BAb6tUZJ6");

initializeContext(undefined, undefined, undefined,undefined, {commitment: "confirmed"} )
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
  })
  .catch((err) => {
    console.error(err);
  });
