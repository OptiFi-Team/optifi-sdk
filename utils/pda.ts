import Context from "../types/context";
import {PublicKey} from "@solana/web3.js";
import {
    OPTIFI_MARKET_MINT_AUTH_PREFIX, SERUM_MARKET_AUTHORITY,
    USDC_CENTRAL_POOL_PREFIX,
    USDC_POOL_AUTH_PREFIX
} from "../constants";
import {findAccountWithSeeds, findExchangeAccount} from "./accounts";

export function derivePDAAddress(context: Context, prefix: string): Promise<[PublicKey, number]> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findAccountWithSeeds(context, [
                Buffer.from(prefix),
                exchangeAddress.toBuffer()
            ])
                .then((res) => resolve(res))
                .catch((err) => reject(err))
        })
    })
}

export function findOptifiMarketMintAuthPDA(context: Context): Promise<[PublicKey, number]> {
   return derivePDAAddress(context, OPTIFI_MARKET_MINT_AUTH_PREFIX);
}

export function findOptifiUSDCPoolAuthPDA(context: Context): Promise<[PublicKey, number]> {
    return derivePDAAddress(context, USDC_POOL_AUTH_PREFIX);
}

export function findOptifiUSDCPoolPDA(context: Context): Promise<[PublicKey, number]> {
    return derivePDAAddress(context, USDC_CENTRAL_POOL_PREFIX);
}

export function findSerumAuthorityPDA(context: Context): Promise<[PublicKey, number]> {
    return derivePDAAddress(context, SERUM_MARKET_AUTHORITY);
}