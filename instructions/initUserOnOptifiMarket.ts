import * as anchor from "@project-serum/anchor";
import { PublicKey, TransactionInstruction, TransactionSignature } from "@solana/web3.js";
import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import { findOptifiExchange, findUserAccount, getDexOpenOrders, userAccountExists } from "../utils/accounts";
import { SERUM_DEX_PROGRAM_ID } from "../constants";
import { OptifiMarket } from "../types/optifi-exchange-types";
import { findSerumAuthorityPDA } from "../utils/pda";
import { createAssociatedTokenAccountInstruction, findAssociatedTokenAccount } from "../utils/token";

/**
 * Initialize a new open orders account for user to place order on the optifi marketAddress
 * @param context
 * @param marketAddress
 */
export default function initUserOnOptifiMarket(context: Context,
    marketAddress: PublicKey,
): Promise<InstructionResult<string>> {
    let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint]);
    return new Promise((resolve, reject) => {
        userAccountExists(context).then(([exists, userAccount]) => {
            if (!exists || !userAccount) reject({
                successful: false,
                error: "User account does not exist"
            } as InstructionResult<any>)
            context.program.account.optifiMarket.fetch(marketAddress).then((marketRes) => {
                let optifiMarket = marketRes as OptifiMarket;
                findSerumAuthorityPDA(context).then(([serumAuthority, _]) => {
                    findOptifiExchange(context).then(([exchangeAddress, _]) => {
                        findUserAccount(context).then(([userAccountAddress, _]) => {
                            getDexOpenOrders(context, optifiMarket.serumMarket, userAccountAddress).then(([dexOpenOrders, bump]) => {
                                // Create or find the users associated token accounts for both of the instrument
                                findAssociatedTokenAccount(context, optifiMarket.instrumentShortSplToken, userAccountAddress).then(([shortAssociatedTokenAccount, _]) => {
                                    findAssociatedTokenAccount(context, optifiMarket.instrumentLongSplToken, userAccountAddress).then(([longAssociatedTokenAccount, _]) => {
                                        context.program.rpc.initUserOnOptifiMarket(bump, {
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
                                            instructions: [
                                                createAssociatedTokenAccountInstruction(
                                                    context.provider.wallet.publicKey,
                                                    shortAssociatedTokenAccount,
                                                    userAccountAddress,
                                                    optifiMarket.instrumentShortSplToken
                                                ),
                                                createAssociatedTokenAccountInstruction(
                                                    context.provider.wallet.publicKey,
                                                    longAssociatedTokenAccount,
                                                    userAccountAddress,
                                                    optifiMarket.instrumentLongSplToken
                                                )
                                            ],
                                        }).then((res) => {
                                            resolve({
                                                successful: true,
                                                data: res as TransactionSignature
                                            })
                                        }).catch((err) => reject(err))
                                    }).catch((err) => {
                                        console.error(err);
                                        reject(err);
                                    })
                                }).catch((err) => {
                                    console.error(err);
                                    reject(err);
                                })
                            }).catch((err) => {
                                console.error("Got error getting open orders", err);
                                reject(err);
                            })
                        }).catch((err) => {
                            console.error(err);
                            reject(err);
                        })
                    }).catch((err) => reject(err))
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err));
    });
};


/**
 * Initialize a new open orders account for user to place order on the optifi marketAddress
 * @param context
 * @param marketAddress
 */
export function initUserOnOptifiMarketV2(context: Context,
    marketAddress: PublicKey,
): Promise<InstructionResult<string>> {
    let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint]);
    return new Promise(async (resolve, reject) => {
        try {

            let inxs: TransactionInstruction[] = []
            let [exists, userAccount] = await userAccountExists(context)
            if (!exists || !userAccount) reject({
                successful: false,
                error: "User account does not exist"
            } as InstructionResult<any>)
            let marketRes = await context.program.account.optifiMarket.fetch(marketAddress)
            let optifiMarket = marketRes as OptifiMarket;
            let [serumAuthority,] = await findSerumAuthorityPDA(context)
            let [exchangeAddress,] = await findOptifiExchange(context)
            let [userAccountAddress,] = await findUserAccount(context)
            let [dexOpenOrders, bump] = await getDexOpenOrders(context, optifiMarket.serumMarket, userAccountAddress)

            // Create or find the users associated token accounts for both of the instrument
            let [userLongTokenVault,] = await findAssociatedTokenAccount(context, optifiMarket.instrumentLongSplToken, userAccountAddress)
            let userLongTokenVaultInfo = await context.connection.getAccountInfo(userLongTokenVault)
            if (!userLongTokenVaultInfo) {
                inxs.push(
                    createAssociatedTokenAccountInstruction(
                        context.provider.wallet.publicKey,
                        userLongTokenVault,
                        userAccountAddress,
                        optifiMarket.instrumentLongSplToken
                    )
                )
            }

            let [userShortTokenVault,] = await findAssociatedTokenAccount(context, optifiMarket.instrumentShortSplToken, userAccountAddress)
            let userShortTokenVaultInfo = await context.connection.getAccountInfo(userShortTokenVault)
            if (!userShortTokenVaultInfo) {
                inxs.push(
                    createAssociatedTokenAccountInstruction(
                        context.provider.wallet.publicKey,
                        userShortTokenVault,
                        userAccountAddress,
                        optifiMarket.instrumentShortSplToken
                    )
                )
            }

            let txid = await context.program.rpc.initUserOnOptifiMarket(bump, {
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
                instructions: inxs

            })

            resolve({
                successful: true,
                data: txid as TransactionSignature
            })
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
};


/**
 * Initialize a new open orders account for user to place order on the optifi marketAddress
 * @param context
 * @param marketAddress
 */
export function createInitUserOnOptifiMarketInstruciton(context: Context,
    marketAddress: PublicKey,
): Promise<TransactionInstruction[]> {
    let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint]);
    return new Promise(async (resolve, reject) => {
        try {

            let inxs: TransactionInstruction[] = []
            let [exists, userAccount] = await userAccountExists(context)
            if (!exists || !userAccount) reject({
                successful: false,
                error: "User account does not exist"
            } as InstructionResult<any>)
            let marketRes = await context.program.account.optifiMarket.fetch(marketAddress)
            let optifiMarket = marketRes as OptifiMarket;
            let [serumAuthority,] = await findSerumAuthorityPDA(context)
            let [exchangeAddress,] = await findOptifiExchange(context)
            let [userAccountAddress,] = await findUserAccount(context)
            let [dexOpenOrders, bump] = await getDexOpenOrders(context, optifiMarket.serumMarket, userAccountAddress)

            // Create or find the users associated token accounts for both of the instrument
            let [userLongTokenVault,] = await findAssociatedTokenAccount(context, optifiMarket.instrumentLongSplToken, userAccountAddress)
            let userLongTokenVaultInfo = await context.connection.getAccountInfo(userLongTokenVault)
            if (!userLongTokenVaultInfo) {
                inxs.push(
                    createAssociatedTokenAccountInstruction(
                        context.provider.wallet.publicKey,
                        userLongTokenVault,
                        userAccountAddress,
                        optifiMarket.instrumentLongSplToken
                    )
                )
            }

            let [userShortTokenVault,] = await findAssociatedTokenAccount(context, optifiMarket.instrumentShortSplToken, userAccountAddress)
            let userShortTokenVaultInfo = await context.connection.getAccountInfo(userShortTokenVault)
            if (!userShortTokenVaultInfo) {
                inxs.push(
                    createAssociatedTokenAccountInstruction(
                        context.provider.wallet.publicKey,
                        userShortTokenVault,
                        userAccountAddress,
                        optifiMarket.instrumentShortSplToken
                    )
                )
            }

            let inx = context.program.instruction.initUserOnOptifiMarket(bump, {
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

            })

            inxs.push(inx)

            resolve(inxs)
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
};

