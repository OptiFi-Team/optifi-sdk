import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import * as anchor from "@project-serum/anchor";
import { findExchangeAccount, findParseOptimizedOracleAccountFromAsset, OracleAccountType } from "../utils/accounts";
import {
    Keypair,
    PublicKey,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    Transaction,
    TransactionSignature
} from "@solana/web3.js";
import { formatExplorerAddress, SolanaEntityType } from "../utils/debug";
import { signAndSendTransaction, TransactionResult, TransactionResultType } from "../utils/transactions";
import { findOptifiUSDCPoolAuthPDA } from "../utils/pda";
import { AccountLayout, createInitializeAccountInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { SWITCHBOARD, USDC_TOKEN_MINT } from "../constants";
import { parseAggregatorAccountData } from "@switchboard-xyz/switchboard-api";
import base58 from "bs58";
import { Asset, OracleDataType } from "../types/optifi-exchange-types";

/**
 * Create a new optifi exchange - the first instruction that will be run in the Optifi system
 *
 * @param context The program context
 */
export default function initialize(context: Context, ogNftMint?: PublicKey): Promise<InstructionResult<TransactionSignature>> {

    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, bump]) => {
            findOptifiUSDCPoolAuthPDA(context).then(async ([poolAuthPDAAddress, poolBump]) => {
                const usdcCentralPoolWallet = anchor.web3.Keypair.generate();
                const usdcFeePoolWallet = anchor.web3.Keypair.generate();

                let btcSpotOracle = await findParseOptimizedOracleAccountFromAsset(context, Asset.Bitcoin, OracleAccountType.Spot)
                let ethSpotOracle = await findParseOptimizedOracleAccountFromAsset(context, Asset.Ethereum, OracleAccountType.Spot)
                let usdcSpotOracle = await findParseOptimizedOracleAccountFromAsset(context, Asset.USDC, OracleAccountType.Spot)
                let btcIvOracle = await findParseOptimizedOracleAccountFromAsset(context, Asset.Bitcoin, OracleAccountType.Iv)
                let ethIvOracle = await findParseOptimizedOracleAccountFromAsset(context, Asset.Ethereum, OracleAccountType.Iv)

                context.connection.getMinimumBalanceForRentExemption(AccountLayout.span).then((min) => {
                    context.program.rpc.initialize(
                        bump,
                        {
                            uuid: context.exchangeUUID,
                            version: 1,
                            exchangeAuthority: context.provider.wallet.publicKey,
                            usdcMint: new PublicKey(USDC_TOKEN_MINT[context.endpoint]),
                            btcSpotOracle,
                            ethSpotOracle,
                            usdcSpotOracle,
                            btcIvOracle,
                            ethIvOracle,
                            ogNftMint: ogNftMint ? ogNftMint : null,
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
                                    new PublicKey(USDC_TOKEN_MINT[context.endpoint]),
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
                                    new PublicKey(USDC_TOKEN_MINT[context.endpoint]),
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