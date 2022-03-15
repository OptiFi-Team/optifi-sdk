import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import initLiquidation from "../../instructions/initLiquidation";
import liquidatePosition from "../../instructions/liquidatePosition";
import registerLiquidationMarket from "../../instructions/registerLiquidationMarket";
import { UserAccount } from "../../types/optifi-exchange-types";
import { findOptifiMarkets } from "../../utils/market";


let userToLiquidate = new PublicKey("Ch6giyKAjJsLUVeE2fDHYpHyH6Z6Rpk7RkAnBmv7jh4d");

let marketAddress = new PublicKey("2Pa41Fqdb43NEYGvpzMavr5QpvNJLwXtKRvVCRCeTu5w");

initializeContext().then(async (context) => {

    liquidatePosition(context, userToLiquidate, marketAddress).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})