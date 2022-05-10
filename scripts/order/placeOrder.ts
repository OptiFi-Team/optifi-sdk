import { TransactionSignature } from "@solana/web3.js";
import { initializeContext } from "../../index";
import placeOrder from "../../instructions/order/placeOrder";
import { OrderSide } from "../../types/optifi-exchange-types";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";
import { userAccountExists } from "../../utils/accounts";
import { market } from "../constants"
import OrderType from "../../types/OrderType";

let price = 1000;
let size = 1;
let side = OrderSide.Bid;
let orderType = OrderType.ImmediateOrCancel;

initializeContext().then((context) => {
        placeOrder(context, market, side, price, size, orderType).then(async (res) => {
            console.log("Placed order ", res);
            if (res.successful) {
                console.log(formatExplorerAddress(context, res.data as TransactionSignature, SolanaEntityType.Transaction));
            } else {
                console.error(res);
            }
        }).catch((err) => {
            console.error(err)
        })
});