import { connection } from "@project-serum/common";
import { PublicKey } from "@solana/web3.js";
import { SERUM_DEX_PROGRAM_ID } from "../constants";
import { initializeContext } from "../index";
import { findUserAccount, getDexOpenOrders } from "../utils/accounts";
import { getOrdersOnMarket } from "../utils/orders";
import {
  OpenOrders
} from "@project-serum/serum";
import { market } from "./constants";
// let userAccount = new PublicKey("5UiD5WNnGVRuTmhfjhVLYvHV8fDiXH5eUNCoBxwJpkYs")

initializeContext().then(async (context) => {
  let optifiMarketInfo = await context.program.account.optifiMarket.fetch(market)
  let [userAccount,] = await findUserAccount(context)
  let [dexOpenOrders, _bump2] = await getDexOpenOrders(
    context,
    optifiMarketInfo.serumMarket,
    userAccount
  );

  console.log("dexOpenOrders: ", dexOpenOrders.toString())
  let openOrdersAccount2 = await OpenOrders.load(
    context.connection,
    dexOpenOrders,
    new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint])
  );
  console.log(openOrdersAccount2)

  console.log("baseTokenFree ", openOrdersAccount2.baseTokenFree.toNumber())
  console.log("baseTokenTotal ", openOrdersAccount2.baseTokenTotal.toNumber())
  console.log("quoteTokenFree ", openOrdersAccount2.quoteTokenFree.toNumber())
  console.log("quoteTokenTotal ", openOrdersAccount2.quoteTokenTotal.toNumber())

  openOrdersAccount2.clientIds.forEach(id => {
    if (id.toNumber() != 0) {
      console.log(id.toNumber());
    }
  });
});

