import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../index";
import { getOrdersOnMarket } from "../utils/orders";
import {market} from "../constants"
//let market = new PublicKey("BzpWij8iXh3t6VFaJ5NWLi6yCNkT24gVTax141LNLGnL");

initializeContext().then((context) => {
    getOrdersOnMarket(context, market).then(orders => {
        for (let order of orders) {
            console.log(order);
            console.log("order id : ", order.orderId.toString());
        }
    });
});