import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import * as anchor from "@project-serum/anchor";
import { findExchangeAccount, findOracleAccountFromAsset, OracleAccountType } from "../utils/accounts";
import {
    PublicKey,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    TransactionSignature
} from "@solana/web3.js";
import { findOptifiUSDCPoolAuthPDA } from "../utils/pda";
import { AccountLayout, createInitializeAccountInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { OPUSDC_TOKEN_MINT } from "../constants";
import { Asset } from "../types/optifi-exchange-types";

/**
 * Create a new optifi exchange - the first instruction that will be run in the Optifi system
 *
 * @param context The program context
 */
export default function initialize(context: Context, ogNftMint?: PublicKey, depositLimit?: number): Promise<InstructionResult<TransactionSignature>> {

    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, bump]) => {
            findOptifiUSDCPoolAuthPDA(context).then(async ([poolAuthPDAAddress, poolBump]) => {
                const usdcCentralPoolWallet = anchor.web3.Keypair.generate();
                const usdcFeePoolWallet = anchor.web3.Keypair.generate();

                context.connection.getMinimumBalanceForRentExemption(AccountLayout.span).then((min) => {
                    context.program.rpc.initialize(
                        bump,
                        {
                            uuid: context.exchangeUUID,
                            version: 1,
                            exchangeAuthority: context.provider.wallet.publicKey,
                            operationAuthority: context.provider.wallet.publicKey,
                            ivAuthority: context.provider.wallet.publicKey,
                            usdcMint: new PublicKey(OPUSDC_TOKEN_MINT[context.cluster]),
                            ogNftMint: ogNftMint ? ogNftMint : null,
                            userDepositLimit: depositLimit ? new anchor.BN(depositLimit) : null,
                        },
                        {
                            accounts: {
                                optifiExchange: exchangeAddress,
                                authority: context.provider.wallet.publicKey,
                                usdcCentralPool: usdcCentralPoolWallet.publicKey,
                                usdcFeePool: usdcFeePoolWallet.publicKey,
                                payer: context.provider.wallet.publicKey,
                                systemProgram: SystemProgram.programId,
                                rent: SYSVAR_RENT_PUBKEY
                            },
                            instructions: [
                                // create usdc central pool
                                SystemProgram.createAccount({
                                    fromPubkey: context.provider.wallet.publicKey,
                                    newAccountPubkey: usdcCentralPoolWallet.publicKey,
                                    lamports: min,
                                    space: AccountLayout.span,
                                    programId: TOKEN_PROGRAM_ID
                                }),
                                createInitializeAccountInstruction(
                                    usdcCentralPoolWallet.publicKey,
                                    new PublicKey(OPUSDC_TOKEN_MINT[context.cluster]),
                                    poolAuthPDAAddress,
                                    TOKEN_PROGRAM_ID
                                ),
                                // create usdc fee pool
                                SystemProgram.createAccount({
                                    fromPubkey: context.provider.wallet.publicKey,
                                    newAccountPubkey: usdcFeePoolWallet.publicKey,
                                    lamports: min,
                                    space: AccountLayout.span,
                                    programId: TOKEN_PROGRAM_ID
                                }),
                                createInitializeAccountInstruction(
                                    usdcFeePoolWallet.publicKey,
                                    new PublicKey(OPUSDC_TOKEN_MINT[context.cluster]),
                                    poolAuthPDAAddress,
                                    TOKEN_PROGRAM_ID
                                )
                            ],
                            signers: [usdcCentralPoolWallet, usdcFeePoolWallet]
                        },
                    ).then((res) => {
                        resolve({
                            successful: true,
                            data: res as TransactionSignature
                        })
                    }).catch((err) => reject(err))
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => {
            console.error(err);
            reject(err);
        })
    });
}