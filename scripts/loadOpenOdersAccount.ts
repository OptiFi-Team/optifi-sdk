import { PublicKey } from "@solana/web3.js";
import { SERUM_DEX_PROGRAM_ID } from "../constants";
import { initializeContext } from "../index";
import { findUserAccount, getDexOpenOrders } from "../utils/accounts";
import { loadOrdersAccountsForOwnerV2, loadOrdersForOwnerOnAllMarkets, loadUnsettledFundForOwnerOnAllMarkets } from "../utils/orders";
import {
  OpenOrders
} from "@project-serum/serum";
import { market } from "./constants";
import { findOptifiMarketsWithFullData } from "../utils/market";
import { getAllOrdersForAccount, addStatusInOrderHistory, getFilterOrdersForAccount } from "../utils/orderHistory";
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
    new PublicKey(SERUM_DEX_PROGRAM_ID[context.cluster])
  );
  console.log(openOrdersAccount2)

  console.log("baseTokenFree ", openOrdersAccount2.baseTokenFree.toNumber())
  console.log("baseTokenTotal ", openOrdersAccount2.baseTokenTotal.toNumber())
  console.log("quoteTokenFree ", openOrdersAccount2.quoteTokenFree.toNumber())
  // Orderbook locked in amount ( how much usdc locked for orderbook?)
  console.log("quoteTokenTotal ", openOrdersAccount2.quoteTokenTotal.toNumber())

  openOrdersAccount2.clientIds.forEach(id => {
    if (id.toNumber() != 0) {
      console.log(id.toNumber());
    }
  });

  let optifiMarkets = await findOptifiMarketsWithFullData(context)
  let [userAccountAddress,] = await findUserAccount(context)

  let openOrdersAccount = await loadOrdersAccountsForOwnerV2(context, optifiMarkets, userAccountAddress)
  console.log("openOrdersAccount: ", openOrdersAccount)

  let unsettledFund = await loadUnsettledFundForOwnerOnAllMarkets(optifiMarkets, openOrdersAccount.map(e => e.openOrdersAccount))
  console.log("unsettledFund: ", unsettledFund)

  // must use "confirmed" as commitment level for tx hostory related requests 
  let context2 = await initializeContext(undefined, undefined, undefined, undefined, undefined, { disableRetryOnRateLimit: true, commitment: "confirmed" })
  let orderHistory = await getAllOrdersForAccount(context2, userAccount, optifiMarkets)
  // console.log("filter: ", await getFilterOrdersForAccount(context2, userAccount, optifiMarkets))
  // order history is optional, get call loadOrdersForOwnerOnAllMarkets without it first. and whenever you get user's order history,
  // just call this loadOrdersForOwnerOnAllMarkets again
  let orders = await loadOrdersForOwnerOnAllMarkets(optifiMarkets, openOrdersAccount.map(e => e.openOrdersAccount), orderHistory)
  console.log("orders: ", orders)
  let res = await addStatusInOrderHistory(orders, orderHistory, context2, userAccount)
  console.log(res)
});

