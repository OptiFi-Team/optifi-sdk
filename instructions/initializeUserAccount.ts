import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import { Exchange, UserAccount } from "../types/optifi-exchange-types";
import * as anchor from "@project-serum/anchor";
import { AccountMeta, Keypair, PublicKey, SystemProgram, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findLiquidationState, findUserAccount, userAccountExists } from "../utils/accounts";
import { AccountLayout, createAssociatedTokenAccountInstruction, createInitializeAccountInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { USDC_TOKEN_MINT } from "../constants";
import { signAndSendTransaction, TransactionResultType } from "../utils/transactions";
import { formatExplorerAddress, SolanaEntityType } from "../utils/debug";
import { findAssociatedTokenAccount } from "../utils/token";

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
                findExchangeAccount(context).then(async ([exchangeId, _]) => {
                    let exchangeRes = await context.program.account.exchange.fetch(exchangeId);
                    // @ts-ignore
                    let exchange = exchangeRes as Exchange;

                    // Create a new account with no seeds for the PDA
                    let newUserMarginAccount = anchor.web3.Keypair.generate();
                    // Get the minimum lamports for rent exemption
                    context.connection.getMinimumBalanceForRentExemption(AccountLayout.span).then(async (min) => {

                        let usdcMint = new PublicKey(USDC_TOKEN_MINT[context.endpoint])
                        let inxs = [
                            anchor.web3.SystemProgram.createAccount({
                                fromPubkey: context.provider.wallet.publicKey,
                                newAccountPubkey: newUserMarginAccount.publicKey, //margin account - usdc vault
                                space: AccountLayout.span,
                                lamports: min,
                                programId: TOKEN_PROGRAM_ID,
                            }),
                            createInitializeAccountInstruction(
                                newUserMarginAccount.publicKey,
                                usdcMint,
                                context.provider.wallet.publicKey,
                                TOKEN_PROGRAM_ID
                            ), // Create a new account for USDC
                        ]

                        // create usdc ata for user if not exist
                        let usdcAta = await getAssociatedTokenAddress(usdcMint, context.provider.wallet.publicKey)
                        let acctInfo = await context.connection.getAccountInfo(usdcAta)
                        if (acctInfo == null) {
                            console.log(`Associated Token Account (USDC) at ${usdcAta.toString()} did not exist, trying to create for user`);
                            inxs.push(createAssociatedTokenAccountInstruction(
                                context.provider.wallet.publicKey,
                                usdcAta,
                                context.provider.wallet.publicKey,
                                usdcMint,
                            ))
                        }
                        let OGNFTMint: PublicKey;
                        let OGNFTVault: PublicKey;
                        let remainingAccounts: AccountMeta[] | undefined = undefined

                        if (exchange.ogNftMint) {
                            OGNFTMint = exchange.ogNftMint as PublicKey;
                            [OGNFTVault] = await findAssociatedTokenAccount(context, OGNFTMint, context.provider.wallet.publicKey)
                            console.log("OGNFTMint: ", OGNFTMint.toString())
                            console.log("OGNFTVault: ", OGNFTVault.toString())
                            remainingAccounts = [{
                                isSigner: false,
                                isWritable: true,
                                pubkey: OGNFTVault,
                            }, {
                                isSigner: false,
                                isWritable: true,
                                pubkey: OGNFTMint,
                            }]
                        }

                        // Actually initialize the account
                        findLiquidationState(context, newUserAccount[0]).then(([liquidationAddress, liquidationBump]) => {
                            context.program.rpc.initUserAccount(
                                {
                                    userAccount: newUserAccount[1],
                                    liquidationAccount: liquidationBump
                                },
                                {
                                    accounts: {
                                        userAccount: newUserAccount[0],
                                        optifiExchange: exchangeId,
                                        userMarginAccountUsdc: newUserMarginAccount.publicKey,
                                        owner: context.provider.wallet.publicKey,
                                        payer: context.provider.wallet.publicKey,
                                        tokenProgram: new PublicKey(TOKEN_PROGRAM_ID),
                                        systemProgram: SystemProgram.programId,
                                        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                                        liquidationAccount: liquidationAddress,
                                    },
                                    remainingAccounts: remainingAccounts,//user nft vault (pubkey [])
                                    signers: [newUserMarginAccount],
                                    // These instructions transfer the necessary lamports to the new user vault
                                    instructions: inxs
                                },
                            ).then((calculateRes) => {
                                resolve({
                                    successful: true,
                                    data: calculateRes as TransactionSignature
                                })
                            }).catch((err) => reject(err))
                        }).catch((err) => {
                            console.error(err);
                            reject(err);
                        });
                    }).catch((err) => {
                        console.error(err);
                        reject(err);
                    });
                }).catch((err) => {
                    console.error(err);
                    reject(err);
                });
            }).catch((err) => {
                console.error(err);
                reject(err);
            });
        }).catch((err) => {
            console.error(err);
            reject(err);
        });
    })
}