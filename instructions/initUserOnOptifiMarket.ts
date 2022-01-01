import * as anchor from "@project-serum/anchor";
import {PublicKey} from "@solana/web3.js";
import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {findOptifiExchange, findUserAccount, getDexOpenOrders, userAccountExists} from "../utils/accounts";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";
import {SERUM_DEX_PROGRAM_ID} from "../constants";
import {OptifiMarket} from "../types/optifi-exchange-types";
import {findSerumAuthorityPDA} from "../utils/pda";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";

/**
 * Initialize a new open orders account for user to place order on the optifi marketAddress
 * @param context
 * @param marketAddress
 */
 export default function initUserOnOptifiMarket(context: Context,
                                                marketAddress: PublicKey,
                                                ) : Promise<InstructionResult<string>> {
     let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint]);
    return new Promise( (resolve, reject) => {
            userAccountExists(context).then(([exists, userAccount]) => {
                if(!exists || !userAccount) reject({
                    successful: false,
                    error: "User account does not exist"
                } as InstructionResult<any>)
                context.program.account.market.fetch(marketAddress).then((marketRes) => {
                    let optifiMarket = marketRes as OptifiMarket;
                    findSerumAuthorityPDA(context).then(([serumAuthority, _]) => {
                        findOptifiExchange(context).then(([exchangeAddress, _]) => {
                            findUserAccount(context).then(([userAccountAddress, _]) => {
                                getDexOpenOrders(context, marketAddress, userAccountAddress).then(([dexOpenOrders, bump]) => {
                                    let initUserTx = context.program.transaction.initUserOnOptifiMarket(bump, {
                                        accounts: {
                                            optifiExchange: exchangeAddress,
                                            user: context.provider.wallet.publicKey,
                                            serumMarketAuthority: serumAuthority,
                                            userAccount: userAccountAddress,
                                            serumOpenOrders: dexOpenOrders,
                                            optifiMarket: marketAddress,
                                            serumMarket: optifiMarket.serumMarket,
                                            serumDexProgramId: serumId,
                                            payer: context.provider.wallet.publicKey,
                                            systemProgram: anchor.web3.SystemProgram.programId,
                                            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                                        },
                                        instructions: [],
                                    })
                                    signAndSendTransaction(context, initUserTx).then((tx) => {
                                        if (tx.resultType === TransactionResultType.Successful) {
                                            let txUrl = formatExplorerAddress(context, tx.txId as string, SolanaEntityType.Transaction);
                                            console.log("Successfully initialized user on Optifi Market, ", txUrl);
                                            resolve({
                                                successful: true,
                                                data: txUrl,
                                            })
                                        } else {
                                            console.error(tx);
                                            reject(tx);
                                        }
                                    }).catch((err) => {
                                        console.error("Got error trying to initialize User on Optifi Market", err);
                                        reject(err);
                                    })
                                })
                            })
                        })
                    })
                })
            });
    });
};

