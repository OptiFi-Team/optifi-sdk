import { initializeContext } from "../index";
import { findOptifiMarkets, getPosition, isUserInitializedOnMarket } from "../utils/market";
import { findOrCreateAssociatedTokenAccount } from "../utils/token";
import { findUserAccount } from "../utils/accounts";
import { OptifiMarket } from "../types/optifi-exchange-types";
import { PublicKey } from "@solana/web3.js";


let marketId = new PublicKey("HgRRCp5Dt18GFW8Gc9bp8hvYct37GrXnWzNUEAgetxMS");


initializeContext().then((context) => {
    findUserAccount(context).then(([userAccountAddress, _]) => {
        context.program.account.optifiMarket.fetch(marketId).then(async (marketRes) => {
            let optifiMarket = marketRes as OptifiMarket;
            console.log("Got optifi market ", optifiMarket);
            let [longAmount, shortAmount] = await getPosition(context,
                optifiMarket,
                userAccountAddress,
            );
            console.log(`market: ${optifiMarket[1]}\n`);
            console.log(`long tokens: ${longAmount}\n`);
            console.log(`short tokens: ${shortAmount}\n`);

        }).catch((err) => console.log(err))
    }).catch((err) => console.log(err))
})