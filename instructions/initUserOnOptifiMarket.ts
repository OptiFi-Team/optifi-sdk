import * as anchor from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {findOptifiExchange, findPDA, findUserAccount, getDexOpenOrders, userAccountExists} from "../utils/accounts";
import { formatExplorerAddress, SolanaEntityType } from "../utils/debug";

/**
 * Initialize a new open orders account for user to place order on the optifi market
 * @param context
 */
 export default async function initUserOnOptifiMarket(context: Context) : Promise<InstructionResult<string>> {
    return new Promise( (resolve, reject) => {
            userAccountExists(context).then(([exists, userAccount]) => {
                if(!exists || !userAccount) reject({
                    successful: false,
                    error: "User account does not exist"
                } as InstructionResult<any>)

                findPDA(context).then(([pda, _bump]) => {
                    findOptifiExchange(context).then(([exchangeAddress, bump]) => {
                        getDexOpenOrders(context).then(([dexOpenOrders, bump2]) => {
                            context.program.rpc.initUserOnOptifiMarket(bump2, {
                                accounts: {
                                  optifiExchange: exchangeAddress,
                                  dexOpenOrders: dexOpenOrders,
                                  optifiMarket: new PublicKey("9pgtcXRUfs9QbsZXBTSCtuMdZGkDabPRR6oFhgBkGXTM"),
                                  serumMarket: context.user.publicKey,
                                  serumDexProgramId: new PublicKey("DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY"),
                                  payer: context.user.publicKey,
                                  pda: pda,
                                  systemProgram: anchor.web3.SystemProgram.programId,
                                  rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                                },
                                // signers: [],
                                instructions: [],
                              }).then((tx) => {
                                let txUrl = formatExplorerAddress(context, tx, SolanaEntityType.Transaction);
                                console.log("Successfully initialized User on Optifi Market, ", txUrl);
                                resolve({
                                    successful: true,
                                    data: txUrl,
                                })
                            }).catch((err) => {
                                console.error("Got error trying to initialize User on Optifi Market", err);
                                reject(err);
                            })
                        })
                    })
                })
            });
    });
};

