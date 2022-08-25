import Context from "../types/context";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { generateExpirations } from "../utils/chains";
import {
    SECONDS_IN_YEAR,
    SUPPORTED_ASSETS,
    SUPPORTED_EXPIRATION_TYPES,
    SUPPORTED_MATURITIES
} from "../constants";
import InstrumentType from "../types/instrumentType";
import ExpiryType from "../types/expiryType";
import { initializeChain, InstrumentContext } from "../instructions/initializeChain";
import { findExchangeAccount, findInstrument } from "../utils/accounts";
import { Duration, Exchange } from "../types/optifi-exchange-types";
import MaturityType from "../types/maturityType";
import { dateToAnchorTimestamp, optifiAssetObjectToNumber } from "../utils/generic";


/**
 * Create new instruments for an exchange
 *
 * @param context
 */
export function createInstruments(context: Context): Promise<PublicKey[]> {
    let expirations = generateExpirations();
    let start = new Date();

    return new Promise(async (resolve, reject) => {
        let instrumentsToCreate: InstrumentContext[] = [];
        let instrumentKeys: PublicKey[] = [];

        for (let asset of SUPPORTED_ASSETS) {
            for (let instrumentTypeRaw of Object.keys(SUPPORTED_EXPIRATION_TYPES)) {
                let instrumentType = Number(instrumentTypeRaw) as InstrumentType;
                let supportedInstrumentExpiries = SUPPORTED_EXPIRATION_TYPES[instrumentType];
                let [exchangeAddress, _] = await findExchangeAccount(context)
                let optifiExchange = await context.program.account.exchange.fetch(exchangeAddress)
                let insturmentCommon = optifiExchange.instrumentCommon;

                for (let expiryType of supportedInstrumentExpiries) {
                    switch (expiryType) {
                        case ExpiryType.Standard:
                            for (let maturity of SUPPORTED_MATURITIES) {
                                let expirationDate = expirations[maturity];
                               
                                // check if the expiry already exists
                                let isExpiryExist = false
                                // @ts-ignore
                                for (let e of insturmentCommon) {
                                    if (optifiAssetObjectToNumber(e.asset) == asset.valueOf() &&
                                        e.expiryDate.toNumber() == dateToAnchorTimestamp(expirationDate).toNumber()
                                    ) {
                                        isExpiryExist = true
                                    }
                                }
                                if (!isExpiryExist) {
                                    let duration: Duration;
                                    switch (maturity) {
                                        case MaturityType.Weekly:
                                            duration = Duration.Weekly;
                                            break;
                                        case MaturityType.Monthly: duration = Duration.Monthly;
                                    }
                                    instrumentsToCreate.push({
                                        asset: asset,
                                        instrumentType: instrumentType,
                                        duration: duration,
                                        start: start,
                                        expiryType: expiryType,
                                        expirationDate: expirationDate,
                                        // expirationDate: new Date("2022-05-13T17:00:00"),
                                    })
                                }
                            }
                            break;
                        // case ExpiryType.Perpetual:
                        //     let duration = Duration.Weekly; // TODO

                        //     instrumentsToCreate.push({
                        //         asset: asset,
                        //         instrumentType: instrumentType,
                        //         duration: duration,
                        //         start: start,
                        //         expiryType: expiryType
                        //     })
                        //     break;
                    }
                }
            }
        }

        const createAllChains = async () => {
            for (let instrument of instrumentsToCreate) {
                console.log("Creating instrument ", instrument);
                await initializeChain(context, instrument)
                    .then((chainRes) => {
                        if (chainRes.successful) {
                            console.debug("Successfully created chain ", chainRes);
                            instrumentKeys.push(...chainRes.data as PublicKey[]);
                        } else {
                            console.error("Couldn't create instrument", chainRes);
                        }
                    }).catch((err) => {
                        console.error("Got error trying to create instrument", err);
                    })
            }
        }



        createAllChains()
            .then(() => resolve(instrumentKeys))
            .catch((err) => {
                console.error(err);
                reject(err);
            }).catch((err) => {
                console.error(err);
                reject(err);
            })
    })
}