import Context from "../types/context";
import { TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findUserAccount } from "../utils/accounts";
import { findOptifiMarkets } from "../utils/market";
import initUserOnOptifiMarket from "../instructions/initUserOnOptifiMarket";

export default async function initUserOnAllMarkets(context: Context): Promise<TransactionSignature[]> {
    let sigs: TransactionSignature[] = [];
    let markets = await findOptifiMarkets(context)
    let [userAccountAddress, _] = await findUserAccount(context);
    let res = await context.program.account.userAccount.fetch(userAccountAddress);
    // @ts-ignore
    let userAccount = res as UserAccount;
    for (let market of markets) {
        console.log("Initializing user on ", market);
        try {
            let res = await initUserOnOptifiMarket(context, market[1], userAccount);
            if (res.successful) {
                console.log("Initialized")
                sigs.push(res.data as TransactionSignature)
            } else {
                console.log("Initialization was unsuccessful");
                console.error(res);
            }
        } catch (e) {
            console.warn("User was already initialized on market", market, e);
        }
    }
    return sigs;
}