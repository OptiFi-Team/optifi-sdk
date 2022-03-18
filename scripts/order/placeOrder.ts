import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { initializeContext } from "../../index";
import placeOrder from "../../instructions/placeOrder";
import { OrderSide } from "../../types/optifi-exchange-types";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";
import { userAccountExists } from "../../utils/accounts";
import { UserAccount } from "../../types/optifi-exchange-types";

let market = new PublicKey("3qCSVYhpkuJoNnkGtL2ddtt3LzB6B5jyx7EohFkCoZyw");
let limit = 1500;
let maxCoinQty = 1; // should be integer

let side = OrderSide.Ask;

initializeContext().then((context) => {
    userAccountExists(context).then(([_, res]) => {
        let userAccount = res as UserAccount;
        context.connection.getTokenAccountBalance(userAccount.userMarginAccountUsdc).then(tokenAmount => {
            console.log("userMarginAccount: ", userAccount.userMarginAccountUsdc.toString());
            console.log("balance: ", tokenAmount.value.uiAmount);
            let maxPcQty = limit * (10 ** tokenAmount.value.decimals) * maxCoinQty;
            placeOrder(context, market, side, limit * (10 ** tokenAmount.value.decimals), maxCoinQty, maxPcQty).then(async (res) => {
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
    }).catch((err) => {
        console.error(err)
    })
});