import { initializeContext } from "../index";
import { getAllOrdersForAccount } from "../utils/orderHistory";
import { findUserAccount } from "../utils/accounts";


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
  })
  .catch((err) => {
    console.error(err);
  });
