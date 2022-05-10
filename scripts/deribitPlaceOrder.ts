import { TransactionSignature } from "@solana/web3.js";
import placeOrder from "../instructions/order/placeOrder";
import { OrderSide } from "../types/optifi-exchange-types";
import { formatExplorerAddress, SolanaEntityType } from "../utils/debug";
import { market } from "./constants";
import OrderType from "../types/OrderType";
import { initializeContext } from "../index";
import {
  getTrades,
  Trades,
  Trade,
  Instrument,
  getInstrumentWithMatchStrike,
} from "../utils/deribitPlaceOrder";
import { findUserAccount } from "../utils/accounts";

let orderType = OrderType.Limit;
let tradeIdRecord: String[] = [];

//if the user is going to place the order which he placed before, then change the user. Use this flag to avoid the same user
let isTheWalletCanPlaceOrder: boolean[] = [true, true, true];

async function getData(trade: Trade) {
  let price = trade.price;
  let size = trade.amount;
  let side = trade.direction == "sell" ? OrderSide.Ask : OrderSide.Bid;
  let wallet: string;
  let walletNumber: number;

  //check is thre any user can place order in isTheWalletCanPlaceOrder, if there isn't , log and break;
  let noSuitableUser = true;
  for (let i of isTheWalletCanPlaceOrder) {
    if (i == true) {
      noSuitableUser = false;
    }
  }
  if (noSuitableUser) {
    throw new Error("no suitable user any more!");
  }

  //here , initializeContext() will random choose an account to place order
  let random: any;
  while (1) {
    console.log("trying to find a suitable user to place order...");
    random = Math.floor(Math.random() * 3);
    //to choose the user who can place order
    if (isTheWalletCanPlaceOrder[random]) break;
  }

  if (random == 0) {
    wallet = process.env.PLACEORDERTEST1 as string;
    walletNumber = 0;
    console.log("choose account 1 to place order");
  } else if (random == 1) {
    wallet = process.env.PLACEORDERTEST2 as string;
    walletNumber = 1;
    console.log("choose account 2 to place order");
  } else {
    wallet = process.env.PLACEORDERTEST3 as string;
    walletNumber = 2;
    console.log("choose account 3 to place order");
  }

  return {
    price,
    size,
    side,
    walletNumber,
    wallet,
  };
}

async function renewTradeAndPlaceOrder(
  instrumentWithMatchStrike: Instrument[],
  start_timestamp: number,
  end_timestamp: number
) {
  let trades = await getTrades(
    instrumentWithMatchStrike,
    start_timestamp,
    end_timestamp
  );
  let isTheWalletCanPlaceOrder: boolean[] = [true, true, true];
  let tradesId = trades.map((e) => e.trade_id);

  //find element in tradesId but not in the tradeIdRecord
  //if there is a new trade, means there is a new trade be found in the instrument and in the time range
  let newTradesId = tradesId.filter((e) => {
    return tradeIdRecord.indexOf(e) === -1;
  });

  let newTrades = trades.filter((trade) => {
    for (let newTradeId of newTradesId) {
      if (newTradeId == trade.trade_id) return true;
    }
  });

  tradeIdRecord = tradeIdRecord.concat(newTradesId);
  if (newTradesId.length != 0) {
    console.log(
      "find new trades to place order! and the trade id is: " + newTradesId
    );
    for (let i = 0; i < newTrades.length; i++) {
      //@ts-ignore
      let { price, size, side, walletNumber, wallet } = await getData(
        newTrades[i]
      );

      let context = await initializeContext(wallet);
      let [userAccountAddress, _] = await findUserAccount(context);
      let res = await context.program.account.userAccount.fetch(userAccountAddress);
      // @ts-ignore
      let userAccount = res as UserAccount;
      try {
        let res = await placeOrder(
          context,
          userAccount,
          market,
          side,
          price,
          size,
          orderType
        );
        console.log("Placed order ", res);
        console.log("wallet " + walletNumber + " for " + price);
        if (res.successful) {
          isTheWalletCanPlaceOrder = [true, true, true];
          console.log(
            formatExplorerAddress(
              context,
              res.data as TransactionSignature,
              SolanaEntityType.Transaction
            )
          );
        } else {
          console.error(res);
        }
      } catch {
        console.log(
          "fail to place order! so change from " + walletNumber + " wallet"
        );
        i--;
        //this user will be forbid in this turn of place order
        isTheWalletCanPlaceOrder[walletNumber] = false;
      }
    }
  } else console.log("no new trade now...");
}

(async () => {
  let instrumentWithMatchStrike: Instrument[] =
    await getInstrumentWithMatchStrike();

  let renewTradesTimes = 3600; //3600
  let msToRunAgain = 5000;//5s
  let timeRangeToGetNewTrades = 1000;
  let aLotOfTradesTimestamp = 1650879594688;

  for (let i = 0; i < renewTradesTimes; i++) {
    setTimeout(async () => {
      let startTime =
        aLotOfTradesTimestamp -
        timeRangeToGetNewTrades + // before then endTime for timeRangeToGetNewTrades
        timeRangeToGetNewTrades * i;
      let endTime = aLotOfTradesTimestamp + timeRangeToGetNewTrades * i;

      await renewTradeAndPlaceOrder(
        instrumentWithMatchStrike,
        startTime,
        endTime
      );
    }, msToRunAgain * i);
  }
})();
