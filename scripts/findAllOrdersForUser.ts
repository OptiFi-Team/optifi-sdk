import { initializeContext } from "../index";
import { getAllOrdersForAccount } from "../utils/orderHistory";
import { findUserAccount } from "../utils/accounts";
import { findOptifiMarketsWithFullData } from "../utils/market";

initializeContext(undefined, undefined, undefined, undefined, undefined, { commitment: "confirmed" })
  .then((context) => {
    findUserAccount(context)
      .then(async ([userAccount, _]) => {
        let optifiMarkets = await findOptifiMarketsWithFullData(context)
        console.log("start getAllOrdersForAccount");
        getAllOrdersForAccount(context, userAccount, optifiMarkets)
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
