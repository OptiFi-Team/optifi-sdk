import Context from "../types/context";
import {
    AccountInfo,
    Connection,
    PublicKey,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    Transaction,
    TransactionInstruction,
    TransactionSignature
} from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Account, AccountState, AccountLayout, ACCOUNT_SIZE, TokenAccountNotFoundError, TokenInvalidAccountOwnerError, TokenInvalidAccountSizeError, TOKEN_PROGRAM_ID, MintLayout, Mint, MINT_SIZE, TokenInvalidMintError } from "@solana/spl-token";
import * as anchor from "@project-serum/anchor";
import { signAndSendTransaction, TransactionResultType } from "./transactions";
import { formatExplorerAddress, SolanaEntityType } from "./debug";

/**
 * Taken from the function of the same name in https://github.com/solana-labs/solana-program-library/blob/master/token/ts/src/instructions/associatedTokenAccount.ts -
 * couldn't use the interface from the library without providing a signer, and we want to make all functionality work in
 * a browser context (without having direct Private key access), so pull it out
 */
export function createAssociatedTokenAccountInstruction(
    payer: PublicKey,
    associatedToken: PublicKey,
    owner: PublicKey,
    mint: PublicKey,
): TransactionInstruction {
    const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: associatedToken, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];

    return new TransactionInstruction({
        keys,
        programId: new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID),
        data: Buffer.alloc(0),
    });
}


export function findAssociatedTokenAccount(context: Context,
    tokenMintAddress: PublicKey,
    owner?: PublicKey): Promise<[PublicKey, number]> {
    let accountOwner = owner || context.provider.wallet.publicKey;
    return anchor.web3.PublicKey.findProgramAddress(
        [
            accountOwner.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            tokenMintAddress.toBuffer(),
        ],
        new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID)
    )
}


export function createAssociatedTokenAccount(context: Context,
    tokenMint: PublicKey,
    owner: PublicKey): Promise<[PublicKey, TransactionSignature]> {
    return new Promise((resolve, reject) => {
        findAssociatedTokenAccount(context, tokenMint, owner).then(([associatedTokenAccountAddress, _]) => {
            let associatedTokenTx = new Transaction();
            associatedTokenTx.add(createAssociatedTokenAccountInstruction(
                context.provider.wallet.publicKey,
                associatedTokenAccountAddress,
                owner,
                tokenMint
            ));
            signAndSendTransaction(context, associatedTokenTx).then((associatedTokenCreationTx) => {
                if (associatedTokenCreationTx.resultType === TransactionResultType.Successful) {
                    console.debug("Created associated token account - ", formatExplorerAddress(
                        context,
                        associatedTokenCreationTx.txId as string,
                        SolanaEntityType.Transaction
                    ));
                    resolve([associatedTokenAccountAddress,
                        associatedTokenCreationTx.txId as TransactionSignature])
                } else {
                    console.error(associatedTokenCreationTx);
                    reject(associatedTokenCreationTx);
                }
            }).catch((err) => {
                console.error(err);
                reject(err);
            })
        }).catch((err) => reject(err))
    })
}

export function findOrCreateAssociatedTokenAccount(context: Context,
    tokenMint: PublicKey,
    owner: PublicKey): Promise<PublicKey> {
    return new Promise((resolve, reject) => {
        findAssociatedTokenAccount(context, tokenMint, owner).then(([associatedTokenAddress, _]) => {
            try {
                context.connection.getAccountInfo(associatedTokenAddress)
                    .then((res) => {
                        if (res) {
                            resolve(associatedTokenAddress);
                        } else {
                            console.debug()
                            // Account doesn't exist
                            createAssociatedTokenAccount(context, tokenMint, owner).then((createRes) => {
                                resolve(associatedTokenAddress);
                            }).catch((err) => {
                                console.error(err);
                                reject(err);
                            })
                        }
                    })
            } catch (e) {
                console.error(e);
                reject(e);
            }
        })
    })
}



/**
 * Retrieve information about a token account
 *
 * @param connection Connection to use
 * @param address    Token account
 * @param programId  SPL Token program account
 *
 * @return Token account information
 */
export async function getTokenAccountFromAccountInfo(
    accountInfo: AccountInfo<Buffer>,
    address: PublicKey,
    programId = TOKEN_PROGRAM_ID
): Promise<Account> {
    const info = accountInfo;
    if (!info) throw new TokenAccountNotFoundError();
    if (!info.owner.equals(programId)) throw new TokenInvalidAccountOwnerError();
    if (info.data.length != ACCOUNT_SIZE) throw new TokenInvalidAccountSizeError();

    const rawAccount = AccountLayout.decode(info.data);

    return {
        address,
        mint: rawAccount.mint,
        owner: rawAccount.owner,
        amount: rawAccount.amount,
        delegate: rawAccount.delegateOption ? rawAccount.delegate : null,
        delegatedAmount: rawAccount.delegatedAmount,
        isInitialized: rawAccount.state !== AccountState.Uninitialized,
        isFrozen: rawAccount.state === AccountState.Frozen,
        isNative: !!rawAccount.isNativeOption,
        rentExemptReserve: rawAccount.isNativeOption ? rawAccount.isNative : null,
        closeAuthority: rawAccount.closeAuthorityOption ? rawAccount.closeAuthority : null,
    };
}



/**
 * Retrieve information about a token mint
 *
 * @param connection Connection to use
 * @param tokenMint    Mint Address
 * @param programId  SPL Token program account
 *
 * @return Token account information
 */
export async function getTokenMintFromAccountInfo(
    accountInfo: AccountInfo<Buffer>,
    tokenMint: PublicKey,
    programId = TOKEN_PROGRAM_ID
): Promise<Mint> {
    const info = accountInfo;
    if (!info) throw new TokenAccountNotFoundError();
    if (!info.owner.equals(programId)) throw new TokenInvalidAccountOwnerError();
    if (info.data.length != MINT_SIZE) throw new TokenInvalidMintError();

    const rawMint = MintLayout.decode(info.data);

    return {
        /** Address of the mint */
        address: tokenMint,
        /**
         * Optional authority used to mint new tokens. The mint authority may only be provided during mint creation.
         * If no mint authority is present then the mint has a fixed supply and no further tokens may be minted.
         */
        mintAuthority: rawMint.mintAuthority,
        /** Total supply of tokens */
        supply: rawMint.supply,
        /** Number of base 10 digits to the right of the decimal place */
        decimals: rawMint.decimals,
        /** Is this mint initialized */
        isInitialized: rawMint.isInitialized,
        /** Optional authority to freeze token accounts */
        freezeAuthority: rawMint.freezeAuthority,
    };
}


/**
 * Retrieve all token accounts of a token mint
 *
 * @param connection Connection to use
 * @param tokenMint    Mint Address
 * @param programId  SPL Token program account
 *
 * @return Token accounts information
 * 
 * Note that this method may be excluded by some rpc nodes
 */
export function findAllTokenAccountsByMint(connection: Connection, tokenMint: PublicKey, programId?: PublicKey): Promise<Array<Account>> {
    return new Promise(async (resolve, reject) => {
        const filters = [
            {
                dataSize: 165
            },
            {
                memcmp: {
                    offset: 0,
                    bytes: tokenMint.toBase58(),
                },

            },
        ]
        let tokenAccounts = await connection.getProgramAccounts(programId || TOKEN_PROGRAM_ID, { filters })
        let res: Account[] = []
        for (let tokenAccount of tokenAccounts) {
            let temp = await getTokenAccountFromAccountInfo(tokenAccount.account, tokenAccount.pubkey)
            res.push(temp)
        }
        resolve(res)
    })
}