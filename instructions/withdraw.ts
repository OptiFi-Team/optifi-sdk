import * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { USDC_TOKEN_MINT } from "../constants";
import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import { UserAccount } from "../types/optifi-exchange-types";
import {findOptifiExchange, findPDA, findUserAccount, userAccountExists} from "../utils/accounts";
import { formatExplorerAddress, SolanaEntityType } from "../utils/debug";
import { signAndSendTransaction } from "../utils/transactions";

/**
 * Make withdraw
 * @param context
 * @param amount
 */
 export default function withdraw(context: Context, amount: BN) : Promise<InstructionResult<string>> {
    return new Promise( (resolve, reject) => {
        findUserAccount(context).then((userAccountAddress) => {
            userAccountExists(context).then(([exists, userAccount]) => {
                if(!exists || !userAccount) reject({
                    successful: false,
                    error: "User account does not exist"
                } as InstructionResult<any>)

                findPDA(context).then(([pda, _bump]) => {
                    findOptifiExchange(context).then(([exchangeAddress, bump]) => {
                        if(userAccount) {
                            context.connection.getRecentBlockhash().then((recentBlockhash) => {
                                let withdrawTx = context.program.transaction.withdraw(amount, {
                                    accounts: {
                                        optifiExchange: exchangeAddress,
                                        userAccount: userAccountAddress[0],
                                        depositTokenMint: new PublicKey(USDC_TOKEN_MINT[context.endpoint]),
                                        // @ts-ignore
                                        userVaultOwnedByPda: userAccount.userVaultOwnedByPda,
                                        withdrawDest: context.provider.wallet.publicKey,
                                        depositor: context.provider.wallet.publicKey,
                                        pda: pda,
                                        tokenProgram: TOKEN_PROGRAM_ID,
                                    },
                                    signers: [],
                                    instructions: [],
                                })
                                withdrawTx.feePayer = context.provider.wallet.publicKey;
                                withdrawTx.recentBlockhash = recentBlockhash.blockhash;
                                signAndSendTransaction(context, withdrawTx).then((res) => {
                                    let txUrl = formatExplorerAddress(context, res.txId as string, SolanaEntityType.Transaction);
                                    console.log("Successfully withdrawn, ", txUrl);
                                    resolve({
                                        successful: true,
                                        data: txUrl
                                    })
                                }).catch((err) => {
                                    console.error(err);
                                    reject({
                                        successful: false,
                                        error: err
                                    } as InstructionResult<any>);
                                })
                            }).catch((err) => {
                                console.error(err);
                                reject(err);
                            });
                        }
                        else {
                            reject({
                                successful: false,
                                error: "User account was not found"
                            } as InstructionResult<any>);
                        }
                    })
                })
            });
        })
    });
};

