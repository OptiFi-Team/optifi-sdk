
import {PublicKey, TransactionSignature} from "@solana/web3.js";
import {initializeContext} from "../index";
// import {formOrderContext} from "../utils/orders";
import placeOrder from "../instructions/placeOrder";
import {OptifiMarket, OrderSide} from "../types/optifi-exchange-types";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";
import {market} from "../constants";
const limit = 1;
//let market = new PublicKey("GzQaUpHVpx1SbtGRjrqenZ9bAae6HyZKSajAzCmpQz2s");

initializeContext().then((context) => {
    context.program.account.optifiMarket.fetch(market).then((marketRes) => {
        let oMarket = marketRes as OptifiMarket;
        console.log("Long is ", oMarket.instrumentLongSplToken.toString(), "short is", oMarket.instrumentShortSplToken.toString())
    })
});