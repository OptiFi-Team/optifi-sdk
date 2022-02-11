import { initializeContext } from "../index";
import { findOptifiMarkets, isUserInitializedOnMarket } from "../utils/market";
import { findOrCreateAssociatedTokenAccount } from "../utils/token";
import { findUserAccount } from "../utils/accounts";

initializeContext().then((context) => {
    findUserAccount(context).then(([userAccountAddress, _]) => {
        findOptifiMarkets(context).then(async (markets) => {
            for (let market of markets) {
                if (await isUserInitializedOnMarket(context, market[1])) {
                    let longAcct = await findOrCreateAssociatedTokenAccount(context, market[0].instrumentLongSplToken, userAccountAddress);
                    let shortAcct = await findOrCreateAssociatedTokenAccount(context, market[0].instrumentShortSplToken, userAccountAddress);
                    let longAmount = await context.connection.getTokenAccountBalance(longAcct);
                    let shortAmount = await context.connection.getTokenAccountBalance(shortAcct)
                    if ((longAmount.value.uiAmount !== null && longAmount.value.uiAmount !== 0) ||
                        (shortAmount.value.uiAmount !== null && shortAmount.value.uiAmount !== 0)) {
                        console.log(`Market: ${market[1].toString()}\nLong tokens: ${longAmount.value.amount}\nShort tokens ${shortAmount.value.amount}`)
                    }
                }
            }
        })
    })

})