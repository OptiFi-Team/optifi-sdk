import Context from "../types/context";
import {PublicKey} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import {
    EXCHANGE_PREFIX,
    INSTRUMENT_PREFIX,
    SERUM_OPEN_ORDERS_PREFIX,
    SWITCHBOARD,
    USER_ACCOUNT_PREFIX,
    USER_TOKEN_ACCOUNT_PDA
} from "../constants";
import {Exchange, UserAccount} from "../types/optifi-exchange-types";
import Asset from "../types/asset";
import InstrumentType from "../types/instrumentType";
import ExpiryType from "../types/expiryType";
import {dateToAnchorTimestampBuffer} from "./generic";

/**
 * Helper function for finding an account with a list of seeds
 *
 * @param context Program context
 * @param seeds The seeds to look for the account with
 */
export function findAccountWithSeeds(context: Context, seeds: Buffer[]): Promise<[PublicKey, number]> {
    return anchor.web3.PublicKey.findProgramAddress(
        seeds,
        context.program.programId
    )
}

/**
 * Find the Solana program address for the user in context with the expected seeds
 *
 * @param context The program context
 */
export function findUserAccount(context: Context): Promise<[PublicKey, number]> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeId, _]) => {
            findAccountWithSeeds(context, [
                Buffer.from(USER_ACCOUNT_PREFIX),
                exchangeId.toBuffer(),
                context.provider.wallet.publicKey.toBuffer()
            ]).then((res) => resolve(res))
                .catch((err) => reject(err));
        })
    })

}

export function findExchangeAccount(context: Context): Promise<[PublicKey, number]> {
    return findAccountWithSeeds(context, [
        Buffer.from(EXCHANGE_PREFIX),
        Buffer.from(context.exchangeUUID)
    ])
}

export function findOptifiExchange(context: Context): Promise<[PublicKey, number]> {
    return findExchangeAccount(context);
}

export function getDexOpenOrders(context: Context,
                                 marketAddress: PublicKey,
                                 userAccountAddress: PublicKey): Promise<[PublicKey, number]> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findAccountWithSeeds(context, [
                Buffer.from(SERUM_OPEN_ORDERS_PREFIX),
                exchangeAddress.toBuffer(),
                marketAddress.toBuffer(),
                userAccountAddress.toBuffer()
            ]).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}

/**
 * Helper function to determine whether or not an optifi user account exists associated
 * with the current user
 *
 * @param context The program context
 */
export function userAccountExists(context: Context): Promise<[boolean, UserAccount?]> {
    return new Promise((resolve) => {
        findUserAccount(context).then((userAccount) => {
            context.program.account.userAccount.fetch(userAccount[0]).then((res) => {
                if (res) {
                    console.log("Account already exists", res);
                    // @ts-ignore
                    resolve([true, res as UserAccount])
                } else {
                    resolve([false, undefined])
                }
            }).catch((err) => {
                console.error(err);
                resolve([false, undefined])
            })
        })
    })
}

export function exchangeAccountExists(context: Context): Promise<[boolean, Exchange?]> {
    return new Promise((resolve) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.exchange.fetch(exchangeAddress).then((res) => {
                if (res) {
                    resolve([true, res as Exchange])
                } else {
                    resolve([false, undefined])
                }
            }).catch(() => {
                resolve([false, undefined])
            })
        })
    })
}

/**
 * Helper function to add the oracle accounts for a particular endpoint to an accounts object
 *
 * @param context The program context
 * @param accounts The current accounts
 */
export function oracleAccountsWrapper(context: Context, accounts: { [name: string]: any }): { [name: string]: any} {
    accounts['btcSpotOracle'] = new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD);
    accounts['btcIvOracle'] = new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_IV);
    accounts['ethSpotOracle'] = new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_USD);
    accounts['ethIvOracle'] = new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_IV)

    return accounts
}

/**
 * Find the PDA, who is the account which controls all user's usdc vaults
 *
 * @param context The program context
 */
 export function findPDA(context: Context): Promise<[PublicKey, number]> {
    return new Promise((resolve, reject) => {
        findOptifiExchange(context).then(([address, bump]) => {
            anchor.web3.PublicKey.findProgramAddress(
                [
                    Buffer.from(USER_TOKEN_ACCOUNT_PDA),
                    address.toBuffer()
                ],
                context.program.programId
            ).then((res) => resolve(res)).catch((err) => reject(err))
        })
    })
}

export function findInstrument(context: Context,
                               asset: Asset,
                               instrumentType: InstrumentType,
                               expiryDate: Date,
                               expiryType: ExpiryType,
                               idx: number): Promise<[PublicKey, number]> {
     return findAccountWithSeeds(context, [
         Buffer.from(INSTRUMENT_PREFIX),
         Buffer.from(Uint8Array.of(asset as number)),
         Buffer.from(Uint8Array.of(instrumentType as number)),
         Buffer.from(Uint8Array.of(expiryType as number)),
         dateToAnchorTimestampBuffer(expiryDate),
         Buffer.from(Uint8Array.of(idx))
     ])
}