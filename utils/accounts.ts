import Context from "../types/context";
import {PublicKey} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import {USER_ACCOUNT_PREFIX, USER_TOKEN_ACCOUNT_PDA} from "../constants";
import {UserAccount} from "../types/optifi-exchange-types";

/**
 * Find the Solana program address for the user in context with the expected seeds
 *
 * @param context The program context
 */
export function findUserAccount(context: Context): Promise<[PublicKey, number]> {
    return anchor.web3.PublicKey.findProgramAddress(
        [
            Buffer.from(USER_ACCOUNT_PREFIX),
            context.user.publicKey.toBuffer()
        ],
        context.program.programId
    )
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
 * Find the PDA, who is the account which controls all user's usdc vaults
 *
 * @param context The program context
 */
 export function findPDA(context: Context): Promise<[PublicKey, number]> {
    return anchor.web3.PublicKey.findProgramAddress(
        [
            Buffer.from(USER_TOKEN_ACCOUNT_PDA),
            context.program.account.exchange.programId.toBuffer()
        ],
        context.program.programId
    )
}