import { initializeContext } from "../index";
import { formatExplorerAddress, SolanaEntityType } from "../utils/debug";
import { findAMMAccounts } from "../utils/amm";
import { getAllOrdersForAccount } from "../utils/orderHistory";
import { findUserAccount } from "../utils/accounts";
import { rejects } from "assert";

import { PublicKey } from "@solana/web3.js";
import { getOrdersOnMarket } from "../utils/orders";
import { getAllTradesForAccount } from "../utils/tradeHistory";
import {market} from "./constants";
// let market = new PublicKey("EdsJP7dzK3TfBSHbjDwNpXUXupgqkXn8yBvSQHwgm1A7");



initializeContext(undefined, undefined, undefined,undefined,undefined,  {commitment: "confirmed"} )
  .then((context) => {
    findUserAccount(context)
      .then(([userAccount, _]) => {
        console.log("start getAllTradesForAccount");
        getAllTradesForAccount(context, userAccount)
          .then((res) => {
            console.log("res - getAllTradesForAccount: ", res);
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
