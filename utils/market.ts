import Context from "../types/context";
import {PublicKey} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { Market } from "@project-serum/serum";
import {OptifiMarket} from "../types/optifi-exchange-types";
import {findAccountWithSeeds, findOptifiExchange} from "./accounts";
import {OPTIFI_MARKET_PREFIX} from "../constants";


export function getMarketInfo (context: Context): Promise<Market> {
    return Market.load(
        context.connection,
        /* marketAddress serumMarket */new PublicKey("DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY"),
        undefined,
        new PublicKey("DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY")
      );
}

function iterateFindMarkets(context: Context,
                            exchangeAddress: PublicKey,
                            idx: number = 0): Promise<OptifiMarket[]> {
    return new Promise((resolve, reject) => {
        let optifiMarkets: OptifiMarket[] = [];
        findAccountWithSeeds(context, [
            Buffer.from(OPTIFI_MARKET_PREFIX),
            exchangeAddress.toBuffer(),
            Buffer.from(new Uint8Array([idx]))
        ]).then(([address, bump]) => {
            context.program.account.optifiMarket.fetch(
                address
            ).then((res) => {
                optifiMarkets.push(res as OptifiMarket);
                iterateFindMarkets(context, exchangeAddress, idx+1).then((res) => {
                    optifiMarkets.push(...res);
                    resolve(optifiMarkets)
                })
            }).catch(() => {
                console.debug("Stopped finding markets at idx ", idx);
                resolve(optifiMarkets);
            })
        })
    })
}

export function findOptifiMarkets(context: Context): Promise<OptifiMarket[]> {
    return new Promise((resolve, reject) => {
        findOptifiExchange(context).then(([exchangeAddress, _]) => {
            iterateFindMarkets(
                context,
                exchangeAddress
            ).then((markets) => {
                console.debug(`Found ${markets.length} markets`);
                resolve(markets);
            })
        })
    })
}

export function findExpiredMarkets(context: Context): Promise<void> {
    return new Promise((resolve, reject) => {
        findOptifiMarkets(context).then((markets) => {
            markets.forEach((market) => {
                // TODO: fetch the instrument from the address, and check the xpiration date
            })
        })
    })
}