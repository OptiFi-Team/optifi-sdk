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
            Promise.all(instrumentPromises).then(() => {
                let optifiAsset = assetToOptifiAsset(instrumentContext.asset);
                let newInstrumentTx = context.program.transaction.createNewInstrument(
                    {
                        instrument0: foundInstruments[0][1],
                        instrument1: foundInstruments[1][1],
                        instrument2: foundInstruments[2][1],
                        instrument3: foundInstruments[3][1],
                        instrument4: foundInstruments[4][1],
                        instrument5: foundInstruments[5][1],
                        instrument6: foundInstruments[6][1],
                        instrument7: foundInstruments[7][1],
                        instrument8: foundInstruments[8][1]
                    },
                    {
                        asset: optifiAssetToNumber(optifiAsset),
                        instrumentType: instrumentTypeToNumber(instrumentTypeToOptifiInstrumentType(instrumentContext.instrumentType)),
                        expiryDate: dateToAnchorTimestamp(instrumentContext.expirationDate),
                        duration: new anchor.BN(instrumentContext.duration),
                        start: dateToAnchorTimestamp(instrumentContext.start),
                        authority: context.provider.wallet.publicKey,
                        contractSizePercent: new anchor.BN(10),
                        expiryType: expiryTypeToNumber(expiryTypeToOptifiExpiryType(instrumentContext.expiryType)),
                        instrument0Seed: foundInstruments[0][2],
                        instrument1Seed: foundInstruments[1][2],
                        instrument2Seed: foundInstruments[2][2],
                        instrument3Seed: foundInstruments[3][2],
                        instrument4Seed: foundInstruments[4][2],
                        instrument5Seed: foundInstruments[5][2],
                        instrument6Seed: foundInstruments[6][2],
                        instrument7Seed: foundInstruments[7][2],
                        instrument8Seed: foundInstruments[8][2]
                    },
                    {
                        accounts: {
                            optifiExchange: exchangeAddress,
                            instrument0: foundInstruments[0][0],
                            instrument1: foundInstruments[1][0],
                            instrument2: foundInstruments[2][0],
                            instrument3: foundInstruments[3][0],
                            instrument4: foundInstruments[4][0],
                            instrument5: foundInstruments[5][0],
                            instrument6: foundInstruments[6][0],
                            instrument7: foundInstruments[7][0],
                            instrument8: foundInstruments[8][0],
                            payer: context.provider.wallet.publicKey,
                            systemProgram: SystemProgram.programId,
                            rent: SYSVAR_RENT_PUBKEY,
                            assetSpotPriceOracleFeed: findOracleAccountFromAsset(context, optifiAsset, OracleAccountType.Spot),
                            assetIvOracleFeed: findOracleAccountFromAsset(context, optifiAsset, OracleAccountType.Iv)
                        },
                    }
                )
               signAndSendTransaction(context, newInstrumentTx)
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
                            resolve({
                                successful: true,
                                data: Object.values(foundInstruments).map((i: [PublicKey, number, string]) => i[0])
                            });
                        } else {
                            console.error(res);
                            reject(res);
                        }

                    })
                    .catch((err) => {
                        console.error("Got error trying to sign and send chain instruction ", err);
                        reject(err);
                    })
            }).catch((err) => {
                console.error("Got error trying to execute instrument promises", err);
                reject(err);
            })
        })
    })
}