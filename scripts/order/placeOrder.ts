import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { initializeContext } from "../../index";
import placeOrder from "../../instructions/placeOrder";
import { OrderSide } from "../../types/optifi-exchange-types";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";
import { userAccountExists } from "../../utils/accounts";
import { UserAccount } from "../../types/optifi-exchange-types";
import { market } from "../constants"

let price = 1000;
let size = 1;
let side = OrderSide.Ask;

initializeContext().then((context) => {
    userAccountExists(context).then(async ([_, res]) => {
        placeOrder(context, market, side, price, size).then(async (res) => {
            console.log("Placed order ", res);
            if (res.successful) {
                console.log(formatExplorerAddress(context, res.data as TransactionSignature, SolanaEntityType.Transaction));
            } else {
                console.error(res);
            }
        }).catch((err) => {
            console.error(err)
        })
    }).catch((err) => {
        console.error(err)
    })
});