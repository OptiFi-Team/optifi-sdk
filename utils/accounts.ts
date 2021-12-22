import Context from "../types/context";
import {PublicKey} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import {EXCHANGE_PREFIX, OPTIFI_EXCHANGE_ID, SWITCHBOARD, USER_ACCOUNT_PREFIX} from "../constants";
import {UserAccount} from "../types/optifi-exchange-types";

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
        findOptifiExchange(context).then(([exchangeId, _]) => {
            findAccountWithSeeds(context, [
                Buffer.from(USER_ACCOUNT_PREFIX),
                exchangeId.toBuffer(),
                context.provider.wallet.publicKey.toBuffer()
            ]).then((res) => resolve(res))
                .catch((err) => reject(err));
        })
    })

}

export function findExchangeAccount(context: Context, uuid: string): Promise<[PublicKey, number]> {
    return findAccountWithSeeds(context, [
        Buffer.from(EXCHANGE_PREFIX),
        Buffer.from(uuid)
    ])
}

export function findOptifiExchange(context: Context): Promise<[PublicKey, number]> {
    return findExchangeAccount(context, OPTIFI_EXCHANGE_ID[context.endpoint]);
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
export function oracleAccountsWrapper(context: Context, accounts: { [name: string]: PublicKey }): { [name: string]: PublicKey } {
    accounts['btc_spot_oracle'] = new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD);
    accounts['btc_iv_oracle'] = new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_IV);
    accounts['eth_spot_oracle'] = new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_USD);
    accounts['eth_iv_oracle'] = new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_IV)

    return accounts
}