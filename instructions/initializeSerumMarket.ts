import {Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction} from "@solana/web3.js";
import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import * as anchor from "@project-serum/anchor";
import {MARKET_STATE_LAYOUT_V3} from "@project-serum/serum";
import {AccountLayout, MintLayout, Token, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {signAndSendTransaction, signTransaction, TransactionResultType} from "../utils/transactions";
import {findExchangeAccount} from "../utils/accounts";
import {SERUM_DEX_PROGRAM_ID} from "../constants";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";
import {findOptifiMarketMintAuthPDA} from "../utils/token";

// Data lengths for different accounts on the market
const REQUEST_QUEUE_DATA_LENGTH = 5132;
const EVENT_QUEUE_DATA_LENGTH = 262156;
const BIDS_DATA_LENGTH = 65548;
const ASKS_DATA_LENGTH = 65548;
const MARKET_DATA_LENGTH = MARKET_STATE_LAYOUT_V3.span;
const ACCOUNT_LAYOUT_DATA_LENGTH = AccountLayout.span;
const MINT_DATA_LENGTH = MintLayout.span;

function deriveVaultNonce(marketKey: PublicKey,
                          dexProgramId: PublicKey,
                          nonceS: number = 0): Promise<[anchor.web3.PublicKey, anchor.BN]> {
    return new Promise((resolve, reject) => {
        const nonce = new anchor.BN(nonceS);
        if (nonceS > 255) {
            reject(new Error("Unable to find nonce"));
        }
        try {
            PublicKey.createProgramAddress([marketKey.toBuffer(), nonce.toArrayLike(Buffer, "le", 8)],
                dexProgramId).then((vaultOwner) => {
                    resolve([vaultOwner, nonce])
            })
        } catch (e) {
            deriveVaultNonce(
                marketKey,
                dexProgramId,
                nonceS+1
            )
                .then((res) => resolve(res))
                .catch((err) => reject(err))
        }
    })

}

/**
 * Helper function to do the requests to get the different balance exemptions for the different
 * data length constants at runtime
 */
function getMinimumRentBalances(context: Context): Promise<{ [size: number]: number}> {
    return new Promise((resolve, reject) => {
        let exemptionSizes: { [size: number]: number } = {};
        Promise.all([
            REQUEST_QUEUE_DATA_LENGTH,
            EVENT_QUEUE_DATA_LENGTH,
            BIDS_DATA_LENGTH,
            ASKS_DATA_LENGTH,
            MARKET_DATA_LENGTH,
            MINT_DATA_LENGTH,
            ACCOUNT_LAYOUT_DATA_LENGTH
        ].map((dataLength) => new Promise((resolve, reject) => {
            context.connection.getMinimumBalanceForRentExemption(dataLength)
                .then((minBalance) => exemptionSizes[dataLength] = minBalance)
                .catch((err) => reject(err));
        })))
            .then(() => resolve(exemptionSizes))
            .catch((err) => reject(err))
    })
}

function initializeAccountsWithLayouts(context: Context,
                                       rentBalances: { [space: number]: number },
                                       marketAccount: Keypair,
                                       coinVaultAccount: Keypair,
                                       pcVaultAccount: Keypair,
                                       pcMintAccount: Keypair,
                                       coinMintAccount: Keypair,
                                       vaultOwner: PublicKey,
): Promise<InstructionResult<void>> {
    return new Promise((resolve, reject) => {
        findOptifiMarketMintAuthPDA(context).then(([mintAuthorityAddress, _]) => {
            // Create the market account with the appropriate layouts
            let marketTransaction = new Transaction();
            marketTransaction.add(
                SystemProgram.createAccount({
                    fromPubkey: context.provider.wallet.publicKey,
                    newAccountPubkey: marketAccount.publicKey,
                    space: MARKET_STATE_LAYOUT_V3,
                    lamports: rentBalances[MARKET_DATA_LENGTH],
                    programId: new PublicKey(SERUM_DEX_PROGRAM_ID)
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
                Token.createInitMintInstruction(
                    TOKEN_PROGRAM_ID,
                    coinMintAccount.publicKey,
                    0,
                    mintAuthorityAddress,
                    mintAuthorityAddress
                ),
                Token.createInitAccountInstruction(
                    TOKEN_PROGRAM_ID,
                    coinMintAccount.publicKey,
                    coinVaultAccount.publicKey,
                    vaultOwner
                ),
                Token.createInitAccountInstruction(
                    TOKEN_PROGRAM_ID,
                    pcMintAccount.publicKey,
                    pcVaultAccount.publicKey,
                    vaultOwner
                )
            )

            signTransaction(context, marketTransaction).then((signedTransaction) => {
                context.provider.send(signedTransaction, [
                    coinMintAccount,
                    coinVaultAccount,
                    pcVaultAccount,
                    marketAccount
                ]).then((res) => {
                    let explorerTxUrl = formatExplorerAddress(context, res, SolanaEntityType.Transaction);
                    console.debug(`Created preliminary serum market accounts, ${explorerTxUrl}`);
                    resolve({
                        successful: true
                    })
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        })
    })
}

/**
 * Initialize a new serum market
 *
 * @param context Program context
 */
export default function initializeSerumMarket(context: Context): Promise<InstructionResult<PublicKey>> {

    let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint]);
    return new Promise((resolve, reject) => {

        // Create the new accounts necessary for the serum market
        let marketAccount = anchor.web3.Keypair.generate();
        let coinMintAccount = anchor.web3.Keypair.generate();
        let pcMintAccount = anchor.web3.Keypair.generate();
        let pcVaultAccount = anchor.web3.Keypair.generate();
        let coinVaultAccount = anchor.web3.Keypair.generate();
        let bidsAccount = anchor.web3.Keypair.generate();
        let asksAccount = anchor.web3.Keypair.generate();
        let requestQueueAccount = anchor.web3.Keypair.generate();
        let eventQueueAccount = anchor.web3.Keypair.generate();

        deriveVaultNonce(marketAccount.publicKey, serumId).then(([vaultOwner, vaultSignerNonce]) => {
            console.debug("Initializing market with nonce ", vaultSignerNonce);
            // Constants
            let coinLotSize = new anchor.BN(1); // let's set 1 as one instrument spl token represents 1 contract
            let pcLotSize = new anchor.BN(1);
            let pcDustThreshold = new anchor.BN(2);

            findExchangeAccount(context).then(([exchangeAddress, _]) => {
                getMinimumRentBalances(context).then((minimumRentBalances) => {
                    initializeAccountsWithLayouts(
                        context,
                        minimumRentBalances,
                        marketAccount,
                        coinVaultAccount,
                        pcVaultAccount,
                        pcMintAccount,
                        coinMintAccount,
                        vaultOwner
                    ).then((res) => {
                        // Actually create the orderbook
                        let tx = context.program.transaction.initializeSerumOrderbook(
                            context.provider.wallet.publicKey, // Authority PK
                            context.provider.wallet.publicKey, // Prune authority PK
                            coinLotSize,
                            pcLotSize,
                            vaultSignerNonce,
                            pcDustThreshold,
                            {
                                accounts: {
                                    optifiExchange: exchangeAddress,
                                    market: marketAccount,
                                    coinMintPk: coinMintAccount.publicKey,
                                    pcMintPk: pcMintAccount.publicKey,
                                    coinVaultPk: coinVaultAccount.publicKey,
                                    pcVaultPk: pcVaultAccount.publicKey,
                                    bidsPk: bidsAccount.publicKey,
                                    asksPk: asksAccount.publicKey,
                                    reqQPk: requestQueueAccount.publicKey,
                                    eventQPk: eventQueueAccount.publicKey,
                                    serumMarketAuthority: context.provider.wallet.publicKey,
                                    systemProgram: SystemProgram.programId,
                                    rent: SYSVAR_RENT_PUBKEY,
                                    serumDexProgramId: serumId,
                                },
                                signers: [
                                    marketAccount,
                                    requestQueueAccount,
                                    eventQueueAccount,
                                    asksAccount,
                                    bidsAccount
                                ],
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
                            }
                        )
                        signAndSendTransaction(context, tx).then((res) => {
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
                }).catch((err) => {
                    console.error("Got error trying to create initial serum accounts", err);
                    reject(err)
                })
            })
        })
    })
}
