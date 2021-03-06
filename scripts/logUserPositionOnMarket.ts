import { initializeContext } from "../index";
import { getPosition } from "../utils/market";
import { findUserAccount } from "../utils/accounts";
import { OptifiMarket } from "../types/optifi-exchange-types";
import { PublicKey } from "@solana/web3.js";
import {market} from "./constants";


initializeContext().then((context) => {
    findUserAccount(context).then(([userAccountAddress, _]) => {
        context.program.account.optifiMarket.fetch(market).then(async (marketRes) => {
            let optifiMarket = marketRes as OptifiMarket;
            console.log("Got optifi market ", optifiMarket);
            let [longAmount, shortAmount] = await getPosition(context,
                optifiMarket,
                userAccountAddress,
            );
            console.log(`market: ${market}\n`);
            console.log(`long tokens: ${longAmount}\n`);
            console.log(`short tokens: ${shortAmount}\n`);

        }).catch((err) => console.log(err))
    }).catch((err) => console.log(err))
})