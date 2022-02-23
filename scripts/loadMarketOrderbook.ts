import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../index";
import { OptifiMarket } from "../types/optifi-exchange-types";
import { getSerumMarket } from "../utils/serum";

let marketId = new PublicKey("4eCGYyNZpZ4XfRbQXFTADX7Xuepb23eUjMGxdWrDnFS6");

initializeContext().then((context) => {
    context.program.account.optifiMarket.fetch(marketId).then((marketRes) => {
        let optifiMarket = marketRes as OptifiMarket;
        console.log("Got optifi market ", optifiMarket);
        getSerumMarket(context, optifiMarket.serumMarket).then((serumMarket) => {
            console.log("Got serum market ", serumMarket);
            serumMarket.loadBids(context.connection).then((bids) => {
                console.log("bids: ", bids.getL2(10));
            })
            serumMarket.loadAsks(context.connection).then((asks) => {
                console.log("asks: ", asks.getL2(10));
            })
        })
    })
})