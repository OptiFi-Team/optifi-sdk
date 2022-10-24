import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import { PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { findExchangeAccount, findInstrument, findOracleAccountFromAsset, OracleAccountType } from "../utils/accounts";
import Asset from "../types/asset";
import InstrumentType from "../types/instrumentType";
import { STRIKE_LADDER_SIZE } from "../constants";
import ExpiryType from "../types/expiryType";
import {
    assetToOptifiAsset,
    dateToAnchorTimestamp, expiryTypeToOptifiExpiryType,
    instrumentTypeToOptifiInstrumentType,
    optifiAssetToNumber,
    instrumentTypeToNumber,
    expiryTypeToNumber,
    optifiDurationToNumber
} from "../utils/generic";
import * as anchor from "@project-serum/anchor";
import { increaseComputeUnitsIx, signAndSendTransaction, TransactionResultType } from "../utils/transactions";
import { formatExplorerAddress, SolanaEntityType } from "../utils/debug";
import { Duration } from "../types/optifi-exchange-types";
import { findMarginStressWithAsset } from "../utils/margin";
import { findOptifiMarketWithIdx } from "../utils/market";
import { readMaterailsForExchange } from "../sequences/boostrap"
import { getSerumMarket } from "../utils/serum";
export interface InstrumentContext {
    asset: Asset,
    instrumentType: InstrumentType,
    duration: Duration,
    start: Date,
    expiryType: ExpiryType,
    expirationDate?: Date
}

export function initializeChain(context: Context,
    instrumentContext: InstrumentContext): Promise<InstructionResult<PublicKey[]>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(async ([exchangeAddress, _]) => {
            console.log("Found exchange account ", exchangeAddress);
            let foundInstruments: { [idx: number]: [PublicKey, number, string] } = {};
            let instrumentPromises: Promise<any>[] = [];
            let a = assetToOptifiAsset(instrumentContext.asset);
            console.log("Asset optifi is ", a);
            let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, instrumentContext.asset);

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
            let doFindOrCreate = async () => {
                for (let i = 0; i < STRIKE_LADDER_SIZE; i++) {
                    console.log("Creating instrument ", i);
                    let instrument = foundInstruments[i];
                    let instrumentAccountInfo = await context.program.account.chain.fetchNullable(instrument[0]);
                    if (!instrumentAccountInfo) {
                        let optifiAsset = assetToOptifiAsset(instrumentContext.asset);
                        let newInstrumentTx = context.program.transaction.createNewInstrument(
                            instrument[1],
                            {
                                asset: optifiAssetToNumber(optifiAsset),
                                instrumentType: instrumentTypeToNumber(instrumentTypeToOptifiInstrumentType(instrumentContext.instrumentType)),
                                expiryDate: dateToAnchorTimestamp(instrumentContext.expirationDate),
                                duration: optifiDurationToNumber(instrumentContext.duration),
                                start: dateToAnchorTimestamp(instrumentContext.start),
                                expiryType: expiryTypeToNumber(expiryTypeToOptifiExpiryType(instrumentContext.expiryType)),
                                contractSize: new anchor.BN(0.01 * 10000),
                                instrumentIdx: i
                            },
                            {
                                accounts: {
                                    optifiExchange: exchangeAddress,
                                    instrument: instrument[0],
                                    payer: context.provider.wallet.publicKey,
                                    systemProgram: SystemProgram.programId,
                                    assetSpotPriceOracleFeed: await findOracleAccountFromAsset(context, optifiAsset, OracleAccountType.Spot),
                                    marginStressAccount: marginStressAddress
                                },
                                preInstructions: [increaseComputeUnitsIx]
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
            }
            Promise.all(instrumentPromises).then(() => {
                doFindOrCreate().then(() => {
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
export function initializeChainForPerps(context: Context,
    instrumentContext: InstrumentContext, serumMarketKey: PublicKey): Promise<InstructionResult<PublicKey[]>> {

    //instrumentContext
    // {
    //     asset: 0,
    //     instrumentType: 2,
    //     duration: { weekly: {} },
    //     start: 2022-10-22T05:37:21.032Z,
    //     expiryType: 1
    //   }

    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(async ([exchangeAddress, _]) => {
            console.log("Found exchange account ", exchangeAddress);
            let foundInstruments: { [idx: number]: [PublicKey, number, string] } = {};
            let instrumentPromises: Promise<any>[] = [];
            console.log("Asset optifi is ", assetToOptifiAsset(instrumentContext.asset));

            let materials = readMaterailsForExchange(exchangeAddress);
            let idx = materials.instruments.length//TODO
            console.log("instruments len: " + idx);

            instrumentPromises.push(findInstrument(
                context,
                assetToOptifiAsset(instrumentContext.asset),
                instrumentTypeToOptifiInstrumentType(instrumentContext.instrumentType),
                expiryTypeToOptifiExpiryType(instrumentContext.expiryType),
                idx,
                instrumentContext.expirationDate
            )
                .then((res) => {
                    foundInstruments[idx] = res
                })
                .catch((err) => {
                    console.error("Got error trying to derive instrument address");
                    reject(err);
                })
            )

            let doFindOrCreate = async () => {
                console.log("Creating instrument ", idx);
                let instrument = foundInstruments[idx];
                let instrumentAccountInfo = await context.program.account.chain.fetchNullable(instrument[0]);
                if (!instrumentAccountInfo) {
                    let optifiAsset = assetToOptifiAsset(instrumentContext.asset);
                    let [derivedMarketAddress] = await findOptifiMarketWithIdx(
                        context,
                        exchangeAddress,
                        idx
                    )
                    let shortSplTokenMint = anchor.web3.Keypair.generate();
                    let serumMarket = await getSerumMarket(context, serumMarketKey)
                    // let newInstrumentTx = context.program.transaction.createNewInstrument(
                    let newInstrumentTx = context.program.transaction.createOptifiPerpsMarket(
                        optifiAssetToNumber(optifiAsset),
                        {
                            accounts: {
                                optifiExchange: exchangeAddress,
                                instrument: instrument[0],
                                systemProgram: SystemProgram.programId,
                                perpAccount: instrument[0],
                                payer: context.provider.wallet.publicKey,
                                optifiMarket: derivedMarketAddress,
                                serumMarket: serumMarketKey,
                                longSplTokenMint: serumMarket.baseMintAddress,
                                shortSplTokenMint: shortSplTokenMint.publicKey,
                            },
                            preInstructions: [increaseComputeUnitsIx]
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
                doFindOrCreate().then(() => {
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