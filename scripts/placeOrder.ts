import {PublicKey, TransactionSignature} from "@solana/web3.js";
import {initializeContext} from "../index";
import {formOrderContext} from "../utils/orders";
import placeOrder from "../instructions/placeOrder";
import {OrderSide} from "../types/optifi-exchange-types";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";

const limit = 1;
let market = new PublicKey("6NU7hMvvDzxBwgdTYQkEsHFr1c5AxyQBFUPjVsszmUFv");

initializeContext().then((context) => {
    formOrderContext(context, market).then((orderContext) => {
        console.log("Depositing...");
        console.log("Serum market is ", formatExplorerAddress(context, orderContext.serumMarket.toString(), SolanaEntityType.Account));
        console.log("Open orders account is ", formatExplorerAddress(context, orderContext.openOrders.toString(), SolanaEntityType.Account))
        placeOrder(context, market, OrderSide.Bid, limit).then((res) => {
            console.log("Placed order ", res);
            if (res.successful) {
                console.log(formatExplorerAddress(context, res.data as TransactionSignature, SolanaEntityType.Transaction));
            } else {
                console.error(res);
            }
        }).catch((err) => {
            console.error(err)
        })
    })

});