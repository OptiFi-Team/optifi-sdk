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
import { initializeChain, InstrumentContext, initializeChainForPerps } from "../instructions/initializeChain";
import { Duration, Exchange } from "../types/optifi-exchange-types";
import { createSerumMarkets } from "./boostrap";
/**
 * Create new instruments for an exchange
 *
 * @param context
 */
export function createPerpsInstrumentsAndMarkets(context: Context): Promise<PublicKey[]> {
    let start = new Date();

    return new Promise(async (resolve, reject) => {
        let instrumentsToCreate: InstrumentContext[] = [];
        let instrumentKeys: PublicKey[] = [];

        for (let asset of SUPPORTED_ASSETS) {
            let instrumentType = Number(2) as InstrumentType;
            let duration = Duration.Weekly;
            let x = {
                asset: asset,
                instrumentType: instrumentType,
                duration: duration,
                start: start,
                expiryType: 1,
                expirationDate: new Date("2022-11-13T17:00:00"),//TODO
            }
            instrumentsToCreate.push(x)
        }

        const createAllChains = async () => {
            console.log("instrumentsToCreate.length")
            console.log(instrumentsToCreate.length)
            for (let instrument of instrumentsToCreate) {
                console.log("Creating instrument ", instrument);

                //create serum markets
                let serumMarketKey = await createSerumMarkets(
                    context,
                    new PublicKey(instrument)//???
                );
                console.log("create serum markets successful: ", serumMarketKey)

                await initializeChainForPerps(context, instrument, serumMarketKey)
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