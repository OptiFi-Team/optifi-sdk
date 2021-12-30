import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {Exchange, OptifiMarket} from "../types/optifi-exchange-types";
import {initialize, initializeSerumMarket, initializeUserAccount} from "../index";
import {exchangeAccountExists, findExchangeAccount, findUserAccount, userAccountExists} from "../utils/accounts";
import {OPTIFI_EXCHANGE_ID, SERUM_MARKETS} from "../constants";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";
import {PublicKey} from "@solana/web3.js";
import {createInstruments} from "./createInstruments";

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
function createOrFetchExchange(context: Context): Promise<void> {
    return new Promise((resolve, reject) => {
        exchangeAccountExists(context).then(([exchAcctExists, exchAcct]) => {
            if (exchAcctExists && exchAcct !== undefined) {
                if (exchAcct.exchangeAuthority.toString() == context.provider.wallet.publicKey.toString()) {
                    console.debug("Successfully fetched existing exchange account, and validated that user is the " +
                        "authority.")
                    resolve();
                } else {
                    reject(new Error(`Exchange authority ${exchAcct.exchangeAuthority} is not user 
                    ${context.provider.wallet.publicKey} - in order to make markets, this must be run
                    as the exchange authority. By specifying a new UUID, you may create a new exchange with yourself 
                    as the authority`))
                }
            } else {
                console.debug("Creating a new exchange");
                initialize(context).then((res) => {
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

/**
 * Helper function to either fetch the user's account on this exchange, or create it if it doesn't already exist
 *
 */
function createUserAccountIfNotExist(context: Context): Promise<void> {
    return new Promise((resolve, reject) => {
            userAccountExists(context).then(([exists, _]) => {
                if (exists) {
                    console.debug("User account already exists");
                    resolve()
                } else {
                    console.debug("User account does not already exist, creating...");
                    initializeUserAccount(context).then((_) => {
                        resolve()
                    }).catch((err) => reject(err))
                }
            }).catch((err) => reject(err))
        }
    )
}

/**
 * Helper function to create as many serum markets as the SERUM_MARKETS constant specifies
 *
 * @param context Program context
 */
async function createSerumMarkets(context: Context): Promise<PublicKey[]> {
    let createdMarkets: PublicKey[] = [];
    // Intentionally do this the slow way because creating the serum markets is a super expensive process -
    // if there's a problem, we want to know before we've committed all our capital
    for (let i = 0; i < SERUM_MARKETS; i++) {
        try {
            let res = await initializeSerumMarket(context);
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

/**
 * Bootstrap the optifi exchange entirely, creating new instruments, etc.
 *
 * @param context The program context
 */
export default function boostrap(context: Context): Promise<InstructionResult<BootstrapResult>> {
    return new Promise((resolve, reject) => {
        // Find or create the addresses of both the exchange and user accounts,
        // and make sure that our user is an authority
        console.log("Finding or initializing a new Optifi exchange...")
        createOrFetchExchange(context).then(() => {
            console.log("Created exchange")
            findExchangeAccount(context).then(([exchangeAddress, _]) => {
                createUserAccountIfNotExist(context).then(() => {
                    console.debug("Created or found user account")
                    findUserAccount(context).then(([accountAddress, _]) => {
                        console.debug("Creating serum markets")
                        // Now that we have both addresses, create as many new serum markets
                        // as are specified in the constants
                        createSerumMarkets(context).then((marketKeys) => {
                            console.debug("Created serum markets ", marketKeys);
                            createInstruments(context)
                            // TODO: for each of the new serum markets, create a new instrument, and a new Optifi market

                        }).catch((err) => {
                            console.error("Got error creating serum markets ", err);

                        })
                    })
                }).catch((err) => reject(err));
            })
        }).catch((err) => reject(err))
    })
}