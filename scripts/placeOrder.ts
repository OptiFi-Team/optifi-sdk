import {PublicKey, TransactionSignature} from "@solana/web3.js";
import {initializeContext} from "../index";
import {formOrderContext} from "../utils/orders";
import placeOrder from "../instructions/placeOrder";
import {OrderSide} from "../types/optifi-exchange-types";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";

const limit = 1;
let market = new PublicKey("GTdFCndTX4JSqWgXFzd29cUoDD35Y98yz4R3byVgVnFf");

initializeContext().then((context) => {
    formOrderContext(context, market, OrderSide.Ask).then((orderContext) => {
        console.log("Depositing...");
        console.log("Serum market is ", formatExplorerAddress(context, orderContext.serumMarket.toString(), SolanaEntityType.Account));
        console.log("Open orders account is ", formatExplorerAddress(context, orderContext.openOrders.toString(), SolanaEntityType.Account))
        placeOrder(context, market, OrderSide.Ask, limit).then((res) => {
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