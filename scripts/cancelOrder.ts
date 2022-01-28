import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { initializeContext } from "../index";
import { formOrderContext, getOrdersOnMarket } from "../utils/orders";
import { OrderSide } from "../types/optifi-exchange-types";
import { formatExplorerAddress, SolanaEntityType } from "../utils/debug";
import { getSerumMarket, watchSettleSerumFunds } from "../utils/serum";
import cancelOrder from "../instructions/cancelOrder";
import { dateToAnchorTimestamp } from "../utils/generic";
import * as anchor from "@project-serum/anchor";

let market = new PublicKey("BzpWij8iXh3t6VFaJ5NWLi6yCNkT24gVTax141LNLGnL");

let orderId = new anchor.BN("18446744092156295689709551612");

// If buy -> Bid, sell -> ask
let side = OrderSide.Bid;


// I think there should be somewhere to save the open orders for user, and
// the user can click button to cancel it. (refer to getOrderOnMarket)

initializeContext().then((context) => {
    formOrderContext(context, market, side).then((orderContext) => {
        console.log("Serum market is ", formatExplorerAddress(context, orderContext.serumMarket.toString(), SolanaEntityType.Account));
        console.log("Open orders account is ", formatExplorerAddress(context, orderContext.openOrders.toString(), SolanaEntityType.Account))

        cancelOrder(context, market, side, orderId).then(async (res) => {
            console.log("Cancel order ", res);
            if (res.successful) {
                console.log(formatExplorerAddress(context, res.data as TransactionSignature, SolanaEntityType.Transaction));
                // @ts-ignore
                if (side === OrderSide.Bid) {
                    await watchSettleSerumFunds(context, market).then((res) => {
                        console.log("Got res!");
                    }).catch((err) => {
                        console.error(err);
                    })
                }
            } else {
                console.error(res);
            }

        }).catch((err) => {
            console.error(err)
        })
    })

});