import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import addReferrer from "../../instructions/user/addReferrer";

let referrer = new PublicKey("HwLPYHdoGvBTHH14SNND1H6weoPSJieQJKQtY6JYScuN");

initializeContext().then(async (context) => {
  addReferrer(context, referrer)
    .then((res) => {
      console.log("Got init res", res);
    })
    .catch((err) => {
      console.error(err);
    });
});
