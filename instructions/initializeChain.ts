import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY} from "@solana/web3.js";
import {findExchangeAccount, findInstrument, findOracleAccountFromAsset, OracleAccountType} from "../utils/accounts";
import Asset from "../types/asset";
import InstrumentType from "../types/instrumentType";
import {STRIKE_LADDER_SIZE, SWITCHBOARD} from "../constants";
import ExpiryType from "../types/expiryType";
import {
    assetToOptifiAsset,
    dateToAnchorTimestamp, expiryTypeToOptifiExpiryType,
    instrumentTypeToOptifiInstrumentType,
    optifiAssetToNumber,
    instrumentTypeToNumber,
    expiryTypeToNumber
} from "../utils/generic";
import * as anchor from "@project-serum/anchor";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";

export interface InstrumentContext {
    asset: Asset,
    instrumentType: InstrumentType,
    duration: number,
    start: Date,
    expiryType: ExpiryType,
    expirationDate?: Date
}

export function initializeChain(context: Context,
                                instrumentContext: InstrumentContext): Promise<InstructionResult<PublicKey[]>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            console.log("Found exchange account ", exchangeAddress);
            let foundInstruments: { [idx: number]: [PublicKey, number, string] } = {};
            let instrumentPromises: Promise<any>[] = [];
            let a = assetToOptifiAsset(instrumentContext.asset);
            console.log("Asset optifi is ", a);
            for (let i = 0; i < STRIKE_LADDER_SIZE; i++) {
                instrumentPromises.push(findInstrument(
                        context,
                        assetToOptifiAsset(instrumentContext.asset),
                        instrumentTypeToOptifiInstrumentType(instrumentContext.instrumentType),
                        expiryTypeToOptifiExpiryType(instrumentContext.expiryType),
                        i,
                        instrumentContext.expirationDate
                    )
                        .then((res) => {
                            foundInstruments[i] = res
                        })
                        .catch((err) => {
                            console.error("Got error trying to derive instrument address");
                            reject(err);
                        })
                )
            }
            let txPromises: Promise<void>[] = [];
            let doCreate = async () => {
                for (let i = 0; i < STRIKE_LADDER_SIZE; i ++) {
                    console.log("Creating instrument ", i);
                    let instrument = foundInstruments[i];
                    let optifiAsset = assetToOptifiAsset(instrumentContext.asset);
                    let newInstrumentTx = context.program.transaction.createNewInstrument(
                        instrument[1],
                        {
                            asset: optifiAssetToNumber(optifiAsset),
                            instrumentType: instrumentTypeToNumber(instrumentTypeToOptifiInstrumentType(instrumentContext.instrumentType)),
                            expiryDate: dateToAnchorTimestamp(instrumentContext.expirationDate),
                            duration: new anchor.BN(instrumentContext.duration),
                            start: dateToAnchorTimestamp(instrumentContext.start),
                            authority: context.provider.wallet.publicKey,
                            contractSizePercent: new anchor.BN(10),
                            expiryType: expiryTypeToNumber(expiryTypeToOptifiExpiryType(instrumentContext.expiryType)),
                            instrumentIdx: i
                        },
                        {
                            accounts: {
                                optifiExchange: exchangeAddress,
                                instrument: instrument[0],
                                payer: context.provider.wallet.publicKey,
                                systemProgram: SystemProgram.programId,
                                assetSpotPriceOracleFeed: findOracleAccountFromAsset(context, optifiAsset, OracleAccountType.Spot),
                                assetIvOracleFeed: findOracleAccountFromAsset(context, optifiAsset, OracleAccountType.Iv)
                            },
                        }
                    )
                    await signAndSendTransaction(context, newInstrumentTx)
                        .then((res) => {
                            console.log(res);
                            if (res.resultType === TransactionResultType.Successful) {
                                console.log("Created new instrument -",
                                    formatExplorerAddress(
                                        context,
                                        res.txId as string,
                                        SolanaEntityType.Transaction,
                                    )
                                )
                            } else {
                                console.error(res);
                                reject(res);
                            }

                        })
                        .catch((err) => {
                            console.error("Got error trying to sign and send chain instruction ", err);
                            reject(err);
                        })
                    }
            }
            Promise.all(instrumentPromises).then(() => {
                doCreate().then(() => {
                    resolve({
                        successful: true,
                        data: Object.values(foundInstruments).map((i: [PublicKey, number, string]) => i[0])
                    })
                }).catch((err) => {
                    console.error(err);
                    reject(err);
                })
            }).catch((err) => {
                console.error("Got error trying to execute instrument promises", err);
                reject(err);
            })
        })
    })
}