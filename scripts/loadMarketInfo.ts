import {PublicKey} from "@solana/web3.js";
import {initializeContext} from "../index";
import {OptifiMarket} from "../types/optifi-exchange-types";
import {getSerumMarket} from "../utils/market";

let marketId = new PublicKey("GjQiVKgUiGBm687z6isR2GqkFaQk31GKm9bBLibJmfMs");

initializeContext().then((context) => {
    context.program.account.optifiMarket.fetch(marketId).then((marketRes) => {
        let optifiMarket = marketRes as OptifiMarket;
        console.log("Got optifi market ", optifiMarket);
        getSerumMarket(context, optifiMarket.serumMarket).then((serumMarket) => {
            console.log("Got serum market ", serumMarket);
            serumMarket.loadBids(context.connection).then((bids) => {
                console.log("Serum bids are - ", bids);
            })
        })
    })
})