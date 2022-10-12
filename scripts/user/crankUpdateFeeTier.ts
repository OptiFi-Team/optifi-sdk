import { initializeContext } from "../../index";
import updateFeeTier from "../../instructions/user/updateFeeTier";
import { getAllUsersOnExchange } from "../../utils/accounts";

initializeContext().then(async (context) => {
  let Users = await getAllUsersOnExchange(context);

  for await (let user of Users) {
    updateFeeTier(context, user.publicKey)
      .then((res) => {
        console.log("Got init res", res);
      })
      .catch((err) => {
        console.error(err);
      });
  }
});
