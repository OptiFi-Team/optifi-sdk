import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import setUserFeeTier from "../../instructions/authority/setUserFeeTier";
import { FeeTier } from "../../types/optifi-exchange-types";

const user = new PublicKey("HwLPYHdoGvBTHH14SNND1H6weoPSJieQJKQtY6JYScuN");
const feeTier = FeeTier.Level5;

initializeContext().then(async (context) => {
  let res = await setUserFeeTier(context, user, feeTier);
  console.log("setUserFeeTier res: ", res);
});
