import Context from "../types/context";
import {PublicKey, Transaction, TransactionSignature} from "@solana/web3.js";
import WalletType from "../types/walletType";
import * as bs58 from "bs58";
import {sign} from "crypto";

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
                const {msg, data} = res as unknown as SlopeTxn;
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

/**
 * Use either the users keypair, or the wallet provider API, to sign and send a transaction
 *
 * @param context
 * @param transaction
 */
export function signAndSendTransaction(context: Context, transaction: Transaction): Promise<TransactionResult> {
    // Sign the transaction before sending it
    let signPromise: Promise<Transaction>;
    if (context.walletType === WalletType.Slope) {
        signPromise = signSlopeTransaction(context, transaction);
    } else {
        signPromise = signStandardProviderTransaction(context, transaction);
    }

    // Send the transaction
    return new Promise((resolve, reject) => {
        signPromise.then((res) => {
            const rawTransaction = res.serialize();
            context.provider.connection.sendRawTransaction(rawTransaction, context.provider.opts)
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
        }).catch((err) => reject(err))
    })
}
