import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {UserAccount} from "../types/optifi-exchange-types";
import * as anchor from "@project-serum/anchor";
import {PublicKey, SystemProgram, TransactionSignature} from "@solana/web3.js";
import {findExchangeAccount, findUserAccount, userAccountExists} from "../utils/accounts";
import {AccountLayout, Token, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {USDC_TOKEN_MINT} from "../constants";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";

/**
 * Create an Optifi controlled user account, to which users can deposit and withdrawal collateral for trading.
 * Owner
 *
 * @param context The program context
 */
export default function initializeUserAccount(context: Context): Promise<InstructionResult<TransactionSignature>> {
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
                findExchangeAccount(context).then(([exchangeId, _]) => {
                    // Create a new account with no seeds for the PDA
                    let newUserMarginAccount = anchor.web3.Keypair.generate();
                    // Get the minimum lamports for rent exemption
                    context.connection.getMinimumBalanceForRentExemption(AccountLayout.span).then(async (min) => {
                        // Actually initialize the account
                        context.connection.getRecentBlockhash().then((recentBlockhash) => {
                            let initUserAccountTx = context.program.transaction.initUserAccount(
                                newUserAccount[1],
                                {
                                    accounts: {
                                        userAccount: newUserAccount[0],
                                        optifiExchange: exchangeId,
                                        userMarginAccountUsdc: newUserMarginAccount.publicKey,
                                        owner: context.provider.wallet.publicKey,
                                        payer: context.provider.wallet.publicKey,
                                        tokenProgram: new PublicKey(TOKEN_PROGRAM_ID),
                                        systemProgram: SystemProgram.programId,
                                        rent: anchor.web3.SYSVAR_RENT_PUBKEY
                                    },
                                    signers: [],
                                    // These instructions transfer the necessary lamports to the new user vault
                                    instructions: [
                                        anchor.web3.SystemProgram.createAccount({
                                            fromPubkey: context.provider.wallet.publicKey,
                                            newAccountPubkey: newUserMarginAccount.publicKey, //margin account - usdc vault
                                            space: AccountLayout.span,
                                            lamports: min,
                                            programId: TOKEN_PROGRAM_ID,
                                        }),
                                        Token.createInitAccountInstruction(
                                            TOKEN_PROGRAM_ID,
                                            USDC_TOKEN_MINT[context.endpoint],
                                            newUserMarginAccount.publicKey,
                                            context.provider.wallet.publicKey
                                        ), // Create a new account for USDC
                                    ],
                                },
                            )
                            initUserAccountTx.recentBlockhash = recentBlockhash.blockhash;
                            initUserAccountTx.feePayer = context.provider.wallet.publicKey;
                            signAndSendTransaction(context, initUserAccountTx, [newUserMarginAccount]).then(
                                    (res) => {
                                  if (res.resultType === TransactionResultType.Successful) {
                                      let txUrl = formatExplorerAddress(context, res.txId as string, SolanaEntityType.Transaction);
                                      console.debug("Transaction successful", txUrl);
                                      resolve({
                                          successful: true,
                                          data: res.txId as TransactionSignature
                                      })
                                  } else {
                                      console.error(res);
                                      reject(res);
                                  }
                            }).catch((err) => {
                                console.error("Got error trying to create account", err);
                                reject(err);
                            })
                        }).catch((err) => {
                            console.error(err);
                            reject(err);
                        });
                    });
                })

            })
        })
    });
}