import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import * as anchor from "@project-serum/anchor";
import { MARKET_STATE_LAYOUT_V3 } from "@project-serum/serum";
import { AccountLayout, createInitializeAccountInstruction, createInitializeMintInstruction, MintLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
    annotateAndSignTransaction,
    annotateTransactionWithBlockhash,
    signAndSendTransaction,
    signTransaction,
    TransactionResultType
} from "../utils/transactions";
import { findExchangeAccount } from "../utils/accounts";
import { COIN_LOT_SIZE, PC_DUST_THRESHOLD, PC_LOT_SIZE, SERUM_DEX_PROGRAM_ID, USDC_TOKEN_MINT } from "../constants";
import { formatExplorerAddress, SolanaEntityType } from "../utils/debug";
import { findOptifiMarketMintAuthPDA, findSerumAuthorityPDA, findSerumPruneAuthorityPDA } from "../utils/pda";
import { deriveVaultNonce } from "../utils/market";
import { Key } from "readline";

// Data lengths for different accounts on the market
const REQUEST_QUEUE_DATA_LENGTH = 5132;
const EVENT_QUEUE_DATA_LENGTH = 262156;
const BIDS_DATA_LENGTH = 65548;
const ASKS_DATA_LENGTH = 65548;
const MARKET_DATA_LENGTH = MARKET_STATE_LAYOUT_V3.span;
const ACCOUNT_LAYOUT_DATA_LENGTH = AccountLayout.span;
const MINT_DATA_LENGTH = MintLayout.span;

/**
 * Helper function to do the requests to get the different balance exemptions for the different
 * data length constants at runtime
 */
function getMinimumRentBalances(context: Context): Promise<{ [size: string]: number }> {
    return new Promise((resolve, reject) => {
        let exemptionBalances: { [size: number]: number } = {};
        Promise.all([
            REQUEST_QUEUE_DATA_LENGTH,
            EVENT_QUEUE_DATA_LENGTH,
            BIDS_DATA_LENGTH,
            ASKS_DATA_LENGTH,
            MARKET_DATA_LENGTH,
            MINT_DATA_LENGTH,
            ACCOUNT_LAYOUT_DATA_LENGTH
        ].map((size) => new Promise((resolve, reject) => {
            try {
                context.connection.getMinimumBalanceForRentExemption(size)
                    .then((res) => {
                        exemptionBalances[size] = res;
                        resolve(res);
                    })
                    .catch((err) => {
                        console.error(err);
                        reject(err);
                    })
            } catch (e) {
                console.error(e);
                reject(e);
            }
        }))).then(() => {
            resolve(exemptionBalances);
        }).catch((err) => reject(err));
    })
}

function initializeAccountsWithLayouts(context: Context,
    rentBalances: { [space: string]: number },
    marketAccount: Keypair,
    coinVaultAccount: Keypair,
    pcVaultAccount: Keypair,
    pcMintAccount: PublicKey,
    coinMintAccount: Keypair,
    vaultOwner: PublicKey,
    decimal: number
): Promise<InstructionResult<void>> {
    return new Promise((resolve, reject) => {
        findOptifiMarketMintAuthPDA(context).then(([mintAuthorityAddress, _]) => {
            // Create the market account with the appropriate layouts
            let marketTransaction = new Transaction();
            marketTransaction.add(
                SystemProgram.createAccount({
                    fromPubkey: context.provider.wallet.publicKey,
                    newAccountPubkey: marketAccount.publicKey,
                    space: MARKET_DATA_LENGTH,
                    lamports: rentBalances[MARKET_DATA_LENGTH],
                    programId: new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint])
                }),
                SystemProgram.createAccount({
                    fromPubkey: context.provider.wallet.publicKey,
                    newAccountPubkey: coinVaultAccount.publicKey,
                    lamports: rentBalances[ACCOUNT_LAYOUT_DATA_LENGTH],
                    space: ACCOUNT_LAYOUT_DATA_LENGTH,
                    programId: TOKEN_PROGRAM_ID
                }),
                SystemProgram.createAccount({
                    fromPubkey: context.provider.wallet.publicKey,
                    newAccountPubkey: pcVaultAccount.publicKey,
                    lamports: rentBalances[ACCOUNT_LAYOUT_DATA_LENGTH],
                    space: ACCOUNT_LAYOUT_DATA_LENGTH,
                    programId: TOKEN_PROGRAM_ID
                }),
                SystemProgram.createAccount({
                    fromPubkey: context.provider.wallet.publicKey,
                    newAccountPubkey: coinMintAccount.publicKey,
                    lamports: rentBalances[MINT_DATA_LENGTH],
                    space: MINT_DATA_LENGTH,
                    programId: TOKEN_PROGRAM_ID
                }),
                createInitializeMintInstruction(
                    coinMintAccount.publicKey,
                    decimal,
                    mintAuthorityAddress,
                    mintAuthorityAddress,
                ),
                createInitializeAccountInstruction(
                    coinVaultAccount.publicKey,
                    coinMintAccount.publicKey,
                    vaultOwner,
                ),
                createInitializeAccountInstruction(
                    pcVaultAccount.publicKey,
                    pcMintAccount,
                    vaultOwner,
                    TOKEN_PROGRAM_ID
                )
            )

            context.provider.send(marketTransaction, [coinMintAccount,
                coinVaultAccount,
                pcVaultAccount,
                marketAccount,
            ]).then((res) => {
                let explorerTxUrl = formatExplorerAddress(context, res, SolanaEntityType.Transaction);
                console.debug(`Created preliminary serum market accounts, ${explorerTxUrl}`);
                resolve({
                    successful: true
                })
            }).catch((err) => reject(err))
        })
    })
}

/**
 * Initialize a new serum market
 *
 * @param context Program context
 */
export default function initializeSerumMarket(context: Context, decimal: number): Promise<InstructionResult<PublicKey>> {

    let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint]);
    return new Promise((resolve, reject) => {

        console.debug("Starting serum market creation");

        // Create the new accounts necessary for the serum market
        let marketAccount = anchor.web3.Keypair.generate();
        let coinMintAccount = anchor.web3.Keypair.generate();
        let pcVaultAccount = anchor.web3.Keypair.generate();
        let usdcMint = new PublicKey(USDC_TOKEN_MINT[context.endpoint]);
        let coinVaultAccount = anchor.web3.Keypair.generate();
        let bidsAccount = anchor.web3.Keypair.generate();
        let asksAccount = anchor.web3.Keypair.generate();
        let requestQueueAccount = anchor.web3.Keypair.generate();
        let eventQueueAccount = anchor.web3.Keypair.generate();

        console.debug("Deriving vault");
        deriveVaultNonce(marketAccount.publicKey, serumId).then(([vaultOwner, vaultSignerNonce]) => {
            console.debug("Initializing market with nonce ", vaultSignerNonce);
            // Constants


            console.debug("Finding exchange account")

            findExchangeAccount(context).then(([exchangeAddress, _]) => {
                findSerumAuthorityPDA(context).then(([authorityAddress, _]) => {
                    findSerumPruneAuthorityPDA(context).then(([pruneAuthorityAddress, _]) => {
                        console.debug("Getting rent balances");
                        getMinimumRentBalances(context).then((minimumRentBalances) => {
                            console.debug("Initializing layout accounts");
                            findOptifiMarketMintAuthPDA(context).then(([mintAuthAddress, _]) => {
                                initializeAccountsWithLayouts(
                                    context,
                                    minimumRentBalances,
                                    marketAccount,
                                    coinVaultAccount,
                                    pcVaultAccount,
                                    usdcMint,
                                    coinMintAccount,
                                    vaultOwner,
                                    decimal
                                ).then((res) => {
                                    let tx = context.program.transaction.initializeSerumOrderbook(
                                        authorityAddress, // Authority PK
                                        pruneAuthorityAddress, // Prune authority PK
                                        new anchor.BN(COIN_LOT_SIZE),
                                        new anchor.BN(PC_LOT_SIZE),
                                        vaultSignerNonce,
                                        new anchor.BN(PC_DUST_THRESHOLD),
                                        {
                                            accounts: {
                                                optifiExchange: exchangeAddress,
                                                market: marketAccount.publicKey,
                                                coinMintPk: coinMintAccount.publicKey,
                                                pcMintPk: usdcMint,
                                                coinVaultPk: coinVaultAccount.publicKey,
                                                pcVaultPk: pcVaultAccount.publicKey,
                                                bidsPk: bidsAccount.publicKey,
                                                asksPk: asksAccount.publicKey,
                                                reqQPk: requestQueueAccount.publicKey,
                                                eventQPk: eventQueueAccount.publicKey,
                                                serumMarketAuthority: authorityAddress,
                                                systemProgram: SystemProgram.programId,
                                                rent: SYSVAR_RENT_PUBKEY,
                                                serumDexProgram: serumId,
                                            },
                                            instructions: [
                                                SystemProgram.createAccount({
                                                    fromPubkey: context.provider.wallet.publicKey,
                                                    newAccountPubkey: requestQueueAccount.publicKey,
                                                    space: REQUEST_QUEUE_DATA_LENGTH,
                                                    lamports: minimumRentBalances[REQUEST_QUEUE_DATA_LENGTH],
                                                    programId: serumId
                                                }),
                                                SystemProgram.createAccount({
                                                    fromPubkey: context.provider.wallet.publicKey,
                                                    newAccountPubkey: eventQueueAccount.publicKey,
                                                    space: EVENT_QUEUE_DATA_LENGTH,
                                                    lamports: minimumRentBalances[EVENT_QUEUE_DATA_LENGTH],
                                                    programId: serumId
                                                }),
                                                SystemProgram.createAccount({
                                                    fromPubkey: context.provider.wallet.publicKey,
                                                    newAccountPubkey: bidsAccount.publicKey,
                                                    space: BIDS_DATA_LENGTH,
                                                    lamports: minimumRentBalances[BIDS_DATA_LENGTH],
                                                    programId: serumId,
                                                }),
                                                SystemProgram.createAccount({
                                                    fromPubkey: context.provider.wallet.publicKey,
                                                    newAccountPubkey: asksAccount.publicKey,
                                                    space: ASKS_DATA_LENGTH,
                                                    lamports: minimumRentBalances[ASKS_DATA_LENGTH],
                                                    programId: serumId
                                                })
                                            ]
                                        });
                                    signAndSendTransaction(context, tx, [
                                        requestQueueAccount,
                                        eventQueueAccount,
                                        asksAccount,
                                        bidsAccount
                                    ]).then((res) => {
                                        if (res.resultType === TransactionResultType.Successful) {
                                            let explorerAddress = formatExplorerAddress(context, res.txId as string, SolanaEntityType.Transaction);
                                            console.debug(`Successfully created new serum market: ${explorerAddress}`);
                                            resolve({
                                                successful: true,
                                                data: marketAccount.publicKey
                                            })
                                        } else {
                                            console.error("Couldn't create market ", res);
                                            reject(res);
                                        }
                                    }).catch((err) => {
                                        console.error("Got error trying to initialize serum market ", err);
                                        reject(err);
                                    })
                                }).catch((err) => {
                                    console.error("Got error trying to retrieve rent balances ", err);
                                    reject(err);
                                })
                            })
                        }).catch((err) => {
                            console.error("Got error trying to create initial serum accounts", err);
                            reject(err)
                        })
                    })
                })
            }).catch((err) => {
                console.error("Got error trying to find exchange account ", err);
                reject(err);
            })
        }).catch((err) => {
            console.error("Got error trying to derive vault nonce ", err);
            reject(err);
        })
    })
}
