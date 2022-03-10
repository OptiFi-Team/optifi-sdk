import { connection } from "@project-serum/common";
import { PublicKey } from "@solana/web3.js";
import { SERUM_DEX_PROGRAM_ID } from "../constants";
import { initializeContext } from "../index";
import { getDexOpenOrders } from "../utils/accounts";
import { getOrdersOnMarket } from "../utils/orders";
import {
  OpenOrders
} from "@project-serum/serum";

let market = new PublicKey("879eWEf9rGRv1TEcG9MkDUbBAgY5yjyja7m4mC3A1Vip");
let userAccount = new PublicKey("5UiD5WNnGVRuTmhfjhVLYvHV8fDiXH5eUNCoBxwJpkYs")

initializeContext().then(async (context) => {
  let optifiMarketInfo = await context.program.account.optifiMarket.fetch(market)

  let [dexOpenOrders, _bump2] = await getDexOpenOrders(
    context,
    optifiMarketInfo.serumMarket,
    userAccount
  );

  console.log("dexOpenOrders: ", dexOpenOrders.toString())
  let openOrdersAccount2 = await OpenOrders.load(
    context.connection,
    // dexOpenOrders,
    new PublicKey("88kf7zfYF14h3JNuaoYu7ZVchQaT36ke4t7rxLRmFGv1"),
    SERUM_DEX_PROGRAM_ID[context.endpoint]
  );
  console.log(openOrdersAccount2)
});

