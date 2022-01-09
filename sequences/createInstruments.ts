import Context from "../types/context";
import {PublicKey, TransactionSignature} from "@solana/web3.js";
import {generateExpirations} from "../utils/chains";
import {
    SECONDS_IN_YEAR,
    SUPPORTED_ASSETS,
    SUPPORTED_EXPIRATION_TYPES,
    SUPPORTED_MATURITIES
} from "../constants";
import InstrumentType from "../types/instrumentType";
import ExpiryType from "../types/expiryType";
import {initializeChain, InstrumentContext} from "../instructions/initializeChain";
import {findInstrument} from "../utils/accounts";


/**
 * Create new instruments for an exchange
 *
 * @param context
 */
export function createInstruments(context: Context): Promise<PublicKey[]> {
    let expirations = generateExpirations();
    let start = new Date();

    return new Promise((resolve, reject) => {
        let signatures: TransactionSignature[] = [];
        let instrumentsToCreate: InstrumentContext[] = [];
        let instrumentKeys: PublicKey[] = [];

        for (let asset of SUPPORTED_ASSETS) {
            for (let instrumentTypeRaw of Object.keys(SUPPORTED_EXPIRATION_TYPES)) {
                let instrumentType = Number(instrumentTypeRaw) as InstrumentType;
                let supportedInstrumentExpiries = SUPPORTED_EXPIRATION_TYPES[instrumentType];

                for (let expiryType of supportedInstrumentExpiries) {
                    switch (expiryType) {
                        case ExpiryType.Standard:
                            for (let maturity of SUPPORTED_MATURITIES) {
                                let expirationDate = expirations[maturity];
                                let duration = (expirationDate.getTime() - new Date().getTime());
                                instrumentsToCreate.push({
                                    asset: asset,
                                    instrumentType: instrumentType,
                                    duration: duration,
                                    start: start,
                                    expiryType: expiryType,
                                    expirationDate: expirationDate,
                                })
                            }
                            break;
                        case ExpiryType.Perpetual:
                            instrumentsToCreate.push({
                                asset: asset,
                                instrumentType: instrumentType,
                                duration: SECONDS_IN_YEAR,
                                start: start,
                                expiryType: expiryType
                            })
                            break;
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