import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { initializeContext } from "../../index";
import placeOrder from "../../instructions/placeOrder";
import { OrderSide } from "../../types/optifi-exchange-types";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";
import { userAccountExists } from "../../utils/accounts";
import { UserAccount } from "../../types/optifi-exchange-types";

let market = new PublicKey("5P8ByngKaQJeaSpjgJmo9o2dSxBXzp9cU5xjkDALEqCR");
let price = 1000;
let size = 0.01; // should be integer
let side = OrderSide.Bid;

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