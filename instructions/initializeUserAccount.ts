import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {UserAccount} from "../types/optifi-exchange-types";
import * as anchor from "@project-serum/anchor";
import {PublicKey, SystemProgram} from "@solana/web3.js";
import {findUserAccount, userAccountExists} from "../utils/accounts";
import {AccountLayout, Token, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {USDC_TOKEN_MINT} from "../constants";

/**
 * Create an Optifi controlled user account, to which users can deposit and withdrawal collateral for trading.
 * Owner
 *
 * @param context The program context
 */
export default function initializeUserAccount(context: Context): Promise<InstructionResult<UserAccount>> {
    return new Promise((resolve, reject) => {
        userAccountExists(context).then(([alreadyExists, _]) => {

            if (alreadyExists) {
                reject({
                    successful: false,
                    error: "User account already existed"
                } as InstructionResult<any>)
            }

            // Derive the address the new user account will be at
            findUserAccount(context).then((newUserAccount) => {
                // Create a new account with no seeds for the PDA
                let newUserVault = anchor.web3.Keypair.generate();

                // Get the minimum lamports for rent exemption
                context.connection.getMinimumBalanceForRentExemption(AccountLayout.span).then((min) => {
                    // Actually initialize the account
                    context.program.rpc.initUserAccount(
                        newUserAccount[1],
                        {
                            accounts: {
                                userAccount: newUserAccount[0],
                                userVaultOwnedByPda: newUserVault.publicKey,
                                owner: context.user.publicKey,
                                payer: context.user.publicKey,
                                tokenProgram: new PublicKey(TOKEN_PROGRAM_ID),
                                systemProgram: SystemProgram.programId,
                                rent: anchor.web3.SYSVAR_RENT_PUBKEY
                            },
                            signers: [
                                context.user,
                                newUserVault
                            ],
                            // These instructions transfer the necessary lamports to the new user vault
                            instructions: [
                                anchor.web3.SystemProgram.createAccount({
                                    fromPubkey: context.user.publicKey,
                                    newAccountPubkey: newUserVault.publicKey, //usdc vault
                                    space: AccountLayout.span,
                                    lamports: min,
                                    programId: TOKEN_PROGRAM_ID,
                                }),
                                Token.createInitAccountInstruction(
                                    TOKEN_PROGRAM_ID,
                                    USDC_TOKEN_MINT[context.endpoint],
                                    newUserVault.publicKey,
                                    context.user.publicKey
                                ), // to receive usdc token
                            ],
                        }
                    ).then(() => {
                        userAccountExists(context).then(([existsNow, acct]) => {
                            if (existsNow) {
                                resolve({
                                    successful: true,
                                    data: acct
                                })
                            } else {
                                reject({
                                    successful: false,
                                    error: "Account didn't exist after initialization"
                                } as InstructionResult<any>)
                            }
                        })
                    }).catch((err) => {
                        console.error("Got error trying to create account", err);
                        reject(err);
                    })
                });
            })
        })
    });
}