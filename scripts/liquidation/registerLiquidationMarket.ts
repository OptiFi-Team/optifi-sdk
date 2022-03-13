import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import initLiquidation from "../../instructions/initLiquidation";
import registerLiquidationMarket from "../../instructions/registerLiquidationMarket";
import { UserAccount } from "../../types/optifi-exchange-types";
import { findOptifiMarkets } from "../../utils/market";


let userToLiquidate = new PublicKey("7yZe39mKS1jEGY3U68FcB9LDpsS8j2Vit5MSr6vqQ9FA");

let marketAddress = new PublicKey("Cr96pBgTtVBGV3uc7NkHcuzFU5E2Cgcr19M8p8ZP2bbW");

initializeContext().then(async (context) => {

    registerLiquidationMarket(context, userToLiquidate, marketAddress).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })

    // let res = await context.program.account.userAccount.fetch(userToLiquidate);
    // let userAccount = res as unknown as UserAccount;
    // let userPositions = userAccount.positions;
    // let optifiMarkets = await findOptifiMarkets(context);

    // // @ts-ignore
    // for (let userPosition of userPositions) {

    //     let b = Object.values(userPosition.instrument)[0] as BN;

    //     for (let optifiMarket of optifiMarkets) {
    //         let a = Object.values(optifiMarket[0].instrument)[0] as BN;
    //         if (a.toString() == b.toString()) {
    //             let marketAddress = optifiMarket[1];

    //             console.log(marketAddress.toString());
    //             registerLiquidationMarket(context, userToLiquidate, marketAddress).then((res) => {
    //                 console.log("Got init res", res);
    //             }).catch((err) => {
    //                 console.error(err);
    //             })
    //         }
    //     }
    // }
})