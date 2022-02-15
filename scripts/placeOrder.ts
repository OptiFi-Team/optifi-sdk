import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { initializeContext } from "../index";
import { formOrderContext } from "../utils/orders";
import placeOrder from "../instructions/placeOrder";
import { OrderSide } from "../types/optifi-exchange-types";
import { formatExplorerAddress, SolanaEntityType } from "../utils/debug";
import { settleSerumFundsIfAnyUnsettled, watchSettleSerumFunds } from "../utils/serum";
import { sleep } from "../utils/generic";

let market = new PublicKey("HgRRCp5Dt18GFW8Gc9bp8hvYct37GrXnWzNUEAgetxMS");
let limit = 0.5;
let maxCoinQty = 1; // should be integer

let side = OrderSide.Ask;

initializeContext().then((context) => {
    formOrderContext(context, market, side).then((orderContext) => {
        console.log("Serum market is ", formatExplorerAddress(context, orderContext.serumMarket.toString(), SolanaEntityType.Account));
        console.log("Open orders account is ", formatExplorerAddress(context, orderContext.openOrders.toString(), SolanaEntityType.Account))
        context.connection.getTokenAccountBalance(orderContext.userMarginAccount).then(tokenAmount => {
            console.log("userMarginAccount: ", orderContext.userMarginAccount.toString());
            console.log("balance: ", tokenAmount.value.uiAmount);
            let maxPcQty = limit * (10 ** tokenAmount.value.decimals) * maxCoinQty;
            placeOrder(context, market, side, limit * (10 ** tokenAmount.value.decimals), maxCoinQty, maxPcQty).then(async (res) => {
                console.log("Placed order ", res);
                if (res.successful) {
                    console.log(formatExplorerAddress(context, res.data as TransactionSignature, SolanaEntityType.Transaction));
                    sleep(5000);
                    await watchSettleSerumFunds(context, market).then((res) => {
                        console.log("Got res!");
                    }).catch((err) => {
                        console.error(err);
                    });
                } else {
                    console.error(res);
                }
            }).catch((err) => {
                console.error(err)
            })
        }).catch((err) => {
            console.error(err)
        })
    })

});