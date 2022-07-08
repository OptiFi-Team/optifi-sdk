import Context from "../types/context";
import { ComputeBudgetProgram, Keypair, LAMPORTS_PER_SOL, PublicKey, Signer, Transaction, TransactionSignature } from "@solana/web3.js";
import WalletType from "../types/walletType";
import * as bs58 from "bs58";

export enum TransactionResultType {
    Successful,
    Failed,
    Cancelled
}

export interface TransactionResult {
    resultType: TransactionResultType,
    txId?: TransactionSignature
}

// This interface from https://github.com/jet-lab/jet-v1/blob/master/app/src/models/JetTypes.ts
interface SlopeTxn {
    msg: string;
    data: {
        publicKey?: string;
        signature?: string;
        signatures?: string[];
    };
}

function signSlopeTransaction(context: Context, transaction: Transaction): Promise<Transaction> {
    return new Promise((resolve, reject) => {
        //Slope wallet funcs only take bs58 strings
        if (context.walletType === WalletType.Slope) {
            context.provider.wallet.signTransaction(
                bs58.encode(
                    transaction.serializeMessage()
                ) as any
            ).then((res) => {
                const { msg, data } = res as unknown as SlopeTxn;
                if (data.publicKey === undefined || data.signature === undefined) {
                    console.error("Transaction signing failed, ", data);
                    reject({
                        resultType: TransactionResultType.Cancelled
                    });
                }
                res.addSignature(new PublicKey(data.publicKey as string),
                    bs58.decode(data.signature as string))
                resolve(res);
            }).catch((err) => {
                console.error(err);
                reject({
                    resultType: TransactionResultType.Cancelled
                } as TransactionResult)
            })
        }
    });
}

function signStandardProviderTransaction(context: Context, transaction: Transaction): Promise<Transaction> {
    return new Promise((resolve, reject) => {
        context.provider.wallet.signTransaction(transaction).then((res) => {
            resolve(res);
        }).catch((err) => {
            console.error(err);
            reject({
                resultType: TransactionResultType.Cancelled
            } as TransactionResult)
        })
    })
}

export function signTransaction(context: Context,
    transaction: Transaction,
    signers?: Signer[]): Promise<Transaction> {
    if (signers && signers.length > 0) {
        transaction.partialSign(...signers);
    }
    // Sign the transaction before sending it
    let signPromise: Promise<Transaction>;
    if (context.walletType === WalletType.Keypair) {
        if (context.walletKeypair === undefined) {
            throw new Error("Wallet type is keypair, but no keypair provided in initialization")
        }
        signPromise = context.provider.wallet.signTransaction(transaction);
    } else if (context.walletType === WalletType.Slope) {
        signPromise = signSlopeTransaction(context, transaction);
    } else {
        signPromise = signStandardProviderTransaction(context, transaction);
    }
    return signPromise;
}

export function annotateTransactionWithBlockhash(context: Context, transaction: Transaction): Promise<Transaction> {
    return new Promise((resolve, reject) => {
        context.connection.getRecentBlockhash().then((blockhash) => {
            transaction.recentBlockhash = blockhash.blockhash;
            transaction.feePayer = context.provider.wallet.publicKey;
            resolve(transaction);
        }).catch((err) => reject(err))
    })
}

export function annotateAndSignTransaction(context: Context,
    transaction: Transaction,
    signers?: Signer[]): Promise<Transaction> {
    return new Promise((resolve, reject) => {
        annotateTransactionWithBlockhash(context, transaction).then((res) => {
            signTransaction(context, transaction, signers)
                .then((res) => resolve(res))
                .catch((err) => reject(err))
        }).catch((err) => reject(err));
    })
}

/**
 * Use either the users keypair, or the wallet provider API, to sign and send a transaction
 *
 * @param context
 * @param transaction
 * @param signers
 */
export function signAndSendTransaction(context: Context,
    transaction: Transaction,
    signers?: Signer[]): Promise<TransactionResult> {

    // Send the transaction
    return new Promise((resolve, reject) => {
        annotateAndSignTransaction(context, transaction, signers).then((res) => {
            const rawTransaction = res.serialize();
            context.provider.connection.sendRawTransaction(
                rawTransaction,
                context.provider.opts)
                .then((txId) => {
                    resolve({
                        txId,
                        resultType: TransactionResultType.Successful
                    })
                })
                .catch((err) => {
                    console.error("Got error in send phase for transaction ", err);
                    reject({
                        resultType: TransactionResultType.Failed
                    } as TransactionResult)
                })
        }).catch((err) => {
            reject(err)
        })
    })
}


// instruction for requesting more compute units
export const increaseComputeUnitsIx = ComputeBudgetProgram.requestUnits({
    units: 1400000,
    additionalFee: 0 * LAMPORTS_PER_SOL // this may change in the future
})

// populate inx account keys from tx account keys according to program idl
export function populateInxAccountKeys(optifiContext, txAccountKeys, inx) {
    let decodedInx = optifiContext.program.coder.instruction.decode(bs58.decode(inx.data))
    // console.log(“decodedInx: “, decodedInx)
    if (decodedInx) {
        let inxName = decodedInx.name
        const idl = optifiContext.program.idl
        let idlAccounts = idl.instructions.find(e => e.name == inxName).accounts
        let res = {}
        idlAccounts.map((acc, i) => {
            res[acc.name] = {
                name: acc.name,
                pubkey: txAccountKeys[inx.accounts[i]],
                accountIndex: inx.accounts[i]
            }
        })
        return res
    }
    // accountKeys[inx.accounts[idlAccounts.accounts.findIndex(e => e.name == “userAccount”)]]
}
