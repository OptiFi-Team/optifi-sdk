import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import { Chain, Exchange, OptifiMarket } from "../types/optifi-exchange-types";
import { initialize, initializeSerumMarket } from "../index";
import {
    createUserAccountIfNotExist,
    exchangeAccountExists,
    findExchangeAccount,
    findUserAccount,
} from "../utils/accounts";
import { SERUM_MARKETS, SUPPORTED_ASSETS } from "../constants";
import { formatExplorerAddress, SolanaEntityType } from "../utils/debug";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { createInstruments } from "./createInstruments";
import { createNextOptifiMarket, createOptifiMarketWithIdx } from "../instructions/createOptifiMarket";
import { assetToOptifiAsset, numberAssetToDecimal, readJsonFile, sleep } from "../utils/generic";
import { findOptifiMarkets, findOptifiMarketWithIdx } from "../utils/market";
import { createMarginStress } from "./createMarginStress";
import fs from "fs";
import path from "path";
import createAMMAccounts from "./createAMMAccounts";
import updateIv from "../instructions/marginStress/updateIv";
import updateOracle from "../instructions/authority/authUpdateOracle";
import Asset from "../types/asset";

export interface BootstrapResult {
    exchange: Exchange,
    markets: OptifiMarket[]
}

/**
 * Helper function to either create or fetch an exchange, validating that the user
 * is the exchange authority
 *
 * @param context The program context
 */
function createOrFetchExchange(context: Context, ogNftMint?: PublicKey, depositLimit?: number): Promise<void> {
    return new Promise((resolve, reject) => {
        exchangeAccountExists(context).then(([exchAcctExists, exchAcct]) => {
            if (exchAcctExists && exchAcct !== undefined) {
                // if (exchAcct.exchangeAuthority.toString() == context.provider.wallet.publicKey.toString()) {
                //     console.debug("Successfully fetched existing exchange account, and validated that user is the " +
                //         "authority.")
                resolve();
                // } else {
                //     reject(new Error(`Exchange authority ${exchAcct.exchangeAuthority} is not user 
                //     ${context.provider.wallet.publicKey} - in order to make markets, this must be run
                //     as the exchange authority. By specifying a new UUID, you may create a new exchange with yourself 
                //     as the authority`))
                // }
            } else {
                console.debug("Creating a new exchange");
                initialize(context, ogNftMint, depositLimit).then((res) => {
                    console.debug("Initialized")
                    if (res.successful) {
                        let createExchangeTxUrl = formatExplorerAddress(
                            context,
                            res.data as string,
                            SolanaEntityType.Transaction
                        );
                        console.debug(`Created new exchange ${createExchangeTxUrl}`);
                        resolve();
                    }
                    else {
                        console.error("Couldn't create new exchange", res);
                        reject(res);
                    }
                }).catch((err) => {
                    console.error(err);
                    reject(err)
                })
            }
        })
    })
}


function createOrFetchInstruments(context: Context): Promise<PublicKey[]> {
    return new Promise((resolve, reject) => {
        if (process.env.INSTRUMENT_KEYS !== undefined) {
            console.log("Using debug keys ", process.env.INSTRUMENT_KEYS);
            let instrumentKeysInit: string[] = readJsonFile<string[]>(process.env.INSTRUMENT_KEYS);
            resolve(instrumentKeysInit.map((i) => new PublicKey(i)));
        } else {
            createInstruments(context).then((res) => resolve(res)).catch((err) => reject(err));
        }
    })
}

/**
 * Helper function to create as many serum markets as the SERUM_MARKETS constant specifies
 *
 * @param context Program context
 */
async function createSerumMarketsV1(context: Context, instrumentKeys: PublicKey[]): Promise<PublicKey[]> {
    let createdMarkets: PublicKey[] = [];
    // Intentionally do this the slow way because creating the serum markets is a super expensive process -
    // if there's a problem, we want to know before we've committed all our capital
    for (let i = 0; i < SERUM_MARKETS; i++) {
        try {
            let initialInstrument = instrumentKeys[i];
            let instrument_res = await context.program.account.chain.fetch(initialInstrument);
            let instrument = instrument_res as unknown as Chain;
            let decimal = numberAssetToDecimal(instrument.asset)!;
            let res = await initializeSerumMarket(context, decimal);
            if (res.successful) {
                createdMarkets.push(res.data as PublicKey);
            } else {
                console.error(res);
                throw new Error("Couldn't create markets")
            }
        } catch (e: unknown) {
            console.error(e);
            throw new Error(e as string | undefined);
        }
    }
    return createdMarkets;
}

export async function createSerumMarkets(context: Context, initialInstrument: PublicKey): Promise<PublicKey> {
    // Intentionally do this the slow way because creating the serum markets is a super expensive process -
    // if there's a problem, we want to know before we've committed all our capital
    try {
        let instrument_res = await context.program.account.chain.fetch(initialInstrument);
        let instrument = instrument_res as unknown as Chain;
        console.log("instrument.asset: ", instrument.asset);
        let decimal = numberAssetToDecimal(instrument.asset)!;
        console.log("decimal: ", decimal);

        let res = await initializeSerumMarket(context, decimal);
        if (res.successful) {
            return res.data as PublicKey;
        } else {
            console.error(res);
            throw new Error("Couldn't create markets")
        }
    } catch (e: unknown) {
        console.error(e);
        throw new Error(e as string | undefined);
    }
}


function createOrRetreiveSerumMarkets(context: Context, instrumentKeys: PublicKey[]): Promise<PublicKey[]> {
    return new Promise((resolve, reject) => {
        if (process.env.SERUM_KEYS !== undefined) {
            console.log("Using debug keys ", process.env.SERUM_KEYS);
            let serumKeysInit: string[] = readJsonFile<string[]>(process.env.SERUM_KEYS);
            resolve(serumKeysInit.map((i) => new PublicKey(i)));
        } else {
            createSerumMarketsV1(context, instrumentKeys).then((res) => resolve(res)).catch((err) => reject(err));
        }
    })
}

function createOptifiMarkets(context: Context,
    marketKeys: PublicKey[],
    instrumentKeys: PublicKey[]): Promise<void> {
    return new Promise((resolve, reject) => {
        // Create the optifi markets
        const createAllMarkets = async () => {
            let existingMarkets = await findOptifiMarkets(context);
            let inUseInstruments: Set<string> = new Set(existingMarkets.map((m) => m[0].instrument.toString()));
            let inUseSerumMarkets: Set<string> = new Set(existingMarkets.map((m) => m[0].serumMarket.toString()));
            let currIdx: number = 0;
            for (let i = 0; i < marketKeys.length; i++) {
                let serumMarketKey = marketKeys[i];
                let initialInstrumentAddress = instrumentKeys[i];
                let marketInUse = inUseSerumMarkets.has(serumMarketKey.toString());
                let instrumentInUse = inUseInstruments.has(initialInstrumentAddress.toString());
                if (marketInUse || instrumentInUse) {
                    if (marketInUse && instrumentInUse) {
                        console.debug(`Market ${serumMarketKey.toString()} and instrument ${initialInstrumentAddress.toString()} have already been used - skipping...`);
                        continue;
                    } else {
                        throw new Error(`Either market ${serumMarketKey.toString()} or instrument 
                                                ${initialInstrumentAddress.toString()} has already been used, but not together - most likely cause is debug env variables are out of sync with exchange state. 
                                                If possible, recommended to use new exchange UUID.`);
                    }
                }
                if (currIdx !== 0) {
                    // Wait to create subsequent markets, beacuse the data is depent on previous markets,
                    // and there are validation delays
                    console.log("Waiting 10 seconds before next market...");
                    await new Promise((resolve) => {
                        setTimeout(() => {
                            resolve(true)
                        }, 15 * 1000)
                    })
                    console.log("Finished, waiting, continuing market creation...");
                }
                let marketCreationFunction = (currIdx === 0 ? createNextOptifiMarket(context,
                    serumMarketKey,
                    initialInstrumentAddress) :
                    createOptifiMarketWithIdx(
                        context,
                        serumMarketKey,
                        initialInstrumentAddress,
                        currIdx + 1
                    ))
                let creationRes = await marketCreationFunction;
                if (creationRes.successful) {
                    let [txSig, createdIdx] = creationRes.data as [TransactionSignature, number];
                    console.log("Successfully created market with idx ", createdIdx, txSig);
                    currIdx = createdIdx;
                } else {
                    console.error(creationRes);
                    throw new Error(`Couldn't create market with serum key ${serumMarketKey.toString()}, 
                                                instrument address ${initialInstrumentAddress.toString()}`);
                }
            }
        }
        createAllMarkets().then(() => {
            console.log("Finished market promises");
            resolve();
        }).catch((err) => {
            console.error(err);
            reject(err);
        });
    })
}


/**
 * Bootstrap the optifi exchange entirely, creating new instruments, etc.
 *
 * @param context The program context
 */
export default function boostrap(context: Context, ogNftMint?: PublicKey, depositLimit?: number): Promise<InstructionResult<BootstrapResult>> {
    console.log("Exchange ID is ", context.exchangeUUID);
    return new Promise(async (resolve, reject) => {
        let [exchangeAddress,] = await findExchangeAccount(context);
        console.log("Exchange is ", exchangeAddress.toString());
        createMaterailsForExchangeIfNotExist(context, exchangeAddress);

        // Find or create the addresses of both the exchange and user accounts,
        // and make sure that our user is an authority
        console.log("Finding or initializing a new Optifi exchange...")

        console.log("please make sure ogNftMint is : ", ogNftMint ? ogNftMint.toString() : null)
        console.log("sleep 20 seconds ...")
        await sleep(20 * 1000)
        await createOrFetchExchange(context, ogNftMint, depositLimit)

        console.log("Created exchange")

        // save the created exchange address to material
        let materials = readMaterailsForExchange(exchangeAddress);
        console.log(materials)
        materials.exchangeAddress = exchangeAddress.toString();
        saveMaterailsForExchange(exchangeAddress, materials);


        // Add Sol Oracle
        let res = await updateOracle(context, assetToOptifiAsset(Asset.Solana));
        console.log("updateOracle res: ", res)

        // Create MarginStress
        console.log("Creating MarginStress accounts");
        await createMarginStress(context);
        console.log("Created MarginStress accounts");
        await sleep(5 * 1000)

        // Update IV
        console.log("Updating Iv");
        await updateIv(context);
        console.log("Updated Iv");

        // create new instruments
        console.debug("Creating Instruments")
        let instrumentKeys = await createOrFetchInstruments(context);
        console.debug("Created Instruments")
        let existingInstruments = materials.instruments.map(e => e.address)
        instrumentKeys.forEach(e => {
            if (!existingInstruments.includes(e.toString())) {
                materials.instruments.push({ address: e.toString(), isInUse: false })
            }
        })
        saveMaterailsForExchange(exchangeAddress, materials);


        // create new serum markets
        console.log("Creating serum markets");
        console.log("Waiting 5 seconds to create Serum Markets");
        await sleep(5000);
        for (let instrumentKey of materials.instruments) {
            if (!instrumentKey.isInUse) {
                let serumMarketKey = await createSerumMarkets(context, new PublicKey(instrumentKey.address))
                materials.serumMarkets.push({
                    address: serumMarketKey.toString(),
                    isInUse: false
                })
                materials.instruments.forEach(e => {
                    if (e.address == instrumentKey.address) {
                        e.isInUse = true
                    }
                })
                saveMaterailsForExchange(exchangeAddress, materials);
                console.log("sleep for 5s")
                await sleep(5 * 1000)
            }
        }

        console.log("Created serum markets");
        saveMaterailsForExchange(exchangeAddress, materials);

        //console.log("String serum market keys are, ", marketKeys.map((i) => i.toString()))
        console.log("Creating optifi markets")

        let existingMarkets = await findOptifiMarkets(context);

        existingMarkets.forEach((market, i) => {
            materials.optifiMarkets[i] = {
                marketId: market[0].optifiMarketId,
                address: market[1].toString(),
                instrument: market[0].instrument.toString(),
                serumMarket: market[0].serumMarket.toString(),
            }
            let serumMarketIdx = materials.serumMarkets.findIndex(e => e.address == market[0].serumMarket.toString())
            if (serumMarketIdx >= 0) {
                materials.serumMarkets[serumMarketIdx].isInUse = true
            }
        })

        saveMaterailsForExchange(exchangeAddress, materials);

        console.log("materials.optifiMarkets: ", materials.optifiMarkets)
        let existingMarketsLen = materials.optifiMarkets.length;
        for (let i = existingMarketsLen; i < 10 * SUPPORTED_ASSETS.length; i++) {
            await createOptifiMarketWithIdx(context,
                new PublicKey(materials.serumMarkets[i].address),
                new PublicKey(materials.instruments[i].address),
                i + 1,
            )

            materials.serumMarkets[i].isInUse = true
            let [optifiMarketAddress,] = await findOptifiMarketWithIdx(context, exchangeAddress, i + 1)
            materials.optifiMarkets[i] = {
                marketId: i + 1,
                address: optifiMarketAddress.toString(),
                instrument: materials.instruments[i].address,
                serumMarket: materials.serumMarkets[i].address,
            }
            saveMaterailsForExchange(exchangeAddress, materials);

            await sleep(15 * 1000)
        }
        console.log("Created optifi markets")

        console.log("Creating MarginStress accounts");
        await createMarginStress(context);
        console.log("Created MarginStress accounts");

        // console.log("Creating AMM accounts");
        // await createAMMAccounts(context)
        // console.log("Created AMM accounts");
    })
}


/**
 * Bootstrap the optifi exchange entirely, creating new instruments, etc.
 *
 * @param context The program context
 */
export function boostrapV1(context: Context): Promise<InstructionResult<BootstrapResult>> {
    console.log("Exchange ID is ", context.exchangeUUID);
    return new Promise((resolve, reject) => {
        // Find or create the addresses of both the exchange and user accounts,
        // and make sure that our user is an authority
        console.log("Finding or initializing a new Optifi exchange...")
        createOrFetchExchange(context).then(() => {
            console.log("Created exchange")
            findExchangeAccount(context).then(([exchangeAddress, _]) => {
                console.log("Exchange is ", exchangeAddress.toString());
                createUserAccountIfNotExist(context).then(() => {
                    console.debug("Created or found user account")
                    findUserAccount(context).then(([accountAddress, _]) => {
                        console.debug("Creating serum markets")
                        // Now that we have both addresses, create as many new serum markets
                        // as are specified in the constants
                        createOrFetchInstruments(context).then(async (instrumentKeys) => {
                            console.log("Creating markets");
                            //console.log("Created instruments ", JSON.stringify(res.map((i) => i.toString())));
                            //process.stdout.write(JSON.stringify(res.map((i) => i.toString())));
                            console.log("Waiting 20 seconds to create Serum Markets");
                            await sleep(20000);
                            createOrRetreiveSerumMarkets(context, instrumentKeys).then((marketKeys) => {
                                //console.log("String serum market keys are, ", marketKeys.map((i) => i.toString()))
                                console.log("Creating instruments")
                                createOptifiMarkets(context,
                                    marketKeys,
                                    instrumentKeys
                                ).then(async () => {
                                    console.log("Waiting 10 seconds to create MarginStress accounts");
                                    await sleep(10000);
                                    console.log("Creating MarginStress accounts");
                                    await createMarginStress(context);
                                }).catch((err) => {
                                    console.error(err);
                                    reject(err);
                                })
                            })

                        }).catch((err) => {
                            console.error("Got error creating serum markets ", err);

                        })
                    })
                }).catch((err) => reject(err));
            })
        }).catch((err) => reject(err))
    })
}

interface ExchangeMaterialInstruments {
    address: string,
    isInUse: boolean,
}
interface ExchangeMaterialSerumMarkets {
    address: string,
    isInUse: boolean,
}

interface ExchangeMaterialMarginStress {
    address: string,
    asset: number
}

interface ExchangeMaterialOptifiMarkets {
    address: string,
    marketId: number,
    instrument: string,
    serumMarket: string,
}

interface ExchangeMaterialAmms {
    address: string,
    asset: number,
    index: number
}

interface ExchangeMaterial {
    network: string,
    programId: string,
    exchangeUUID: string,
    exchangeAddress: string,
    instruments: ExchangeMaterialInstruments[],
    serumMarkets: ExchangeMaterialSerumMarkets[],
    optifiMarkets: ExchangeMaterialOptifiMarkets[],
    marginStressAccounts: ExchangeMaterialMarginStress[],
    amms: ExchangeMaterialAmms[],
}


const logsDirPrefix = "logs"
export function readMaterailsForExchange(exchangeAddress: PublicKey): ExchangeMaterial {
    let filePath = path.resolve(__dirname, logsDirPrefix, exchangeAddress.toString() + ".json");
    return JSON.parse(
        fs.readFileSync(
            filePath,
            "utf-8"
        )
    )
}

export function saveMaterailsForExchange(exchangeAddress: PublicKey, data: ExchangeMaterial) {
    let filename = path.resolve(__dirname, logsDirPrefix, exchangeAddress.toString() + ".json");
    fs.writeFileSync(filename, JSON.stringify(data, null, 4));
}

function createMaterailsForExchangeIfNotExist(context: Context, exchangeAddress: PublicKey) {
    let filename = path.resolve(__dirname, logsDirPrefix, exchangeAddress.toString() + ".json");
    if (!fs.existsSync(filename)) {
        let data: ExchangeMaterial = {
            network: context.cluster.toString(),
            programId: context.program.programId.toString(),
            exchangeUUID: context.exchangeUUID,
            exchangeAddress: exchangeAddress.toString(),
            instruments: [],
            serumMarkets: [],
            optifiMarkets: [],
            marginStressAccounts: [],
            amms: []
        }
        fs.writeFileSync(filename, JSON.stringify(data, null, 4));
    }
}
