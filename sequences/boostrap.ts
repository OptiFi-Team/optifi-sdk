import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {Exchange, OptifiMarket} from "../types/optifi-exchange-types";
import {initialize, initializeSerumMarket, initializeUserAccount} from "../index";
import {exchangeAccountExists, findExchangeAccount, findUserAccount, userAccountExists} from "../utils/accounts";
import {OPTIFI_EXCHANGE_ID, SERUM_MARKETS} from "../constants";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";
import {PublicKey} from "@solana/web3.js";

export interface BootstrapResult {
    exchange: Exchange,
    markets: OptifiMarket[]
}


/**
 * Helper function to either create or fetch an exchange, validating that the user
 * is the exchange authority
 *
 * @param context The program context
 * @param uuid The UUID of the exchange
 */
function createOrFetchExchange(context: Context, uuid: string): Promise<void> {
    return new Promise((resolve, reject) => {
        exchangeAccountExists(context, uuid).then(([exchAcctExists, exchAcct]) => {
            if (exchAcctExists && exchAcct !== undefined) {
                if (exchAcct.exchangeAuthority == context.provider.wallet.publicKey) {
                    console.debug("Successfully fetched existing exchange account, and validated that user is the" +
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
                initialize(context, uuid).then((res) => {
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
                }).catch((err) => reject(err))
            }
        })
    })
}

/**
 * Helper function to either fetch the user's account on this exchange, or create it if it doesn't already exist
 *
 */
function createUserAccountIfNotExist(context: Context, exchangeUuid: string): Promise<void> {
    return new Promise((resolve, reject) => {
            userAccountExists(context, exchangeUuid).then(([exists, _]) => {
                if (exists) {
                    console.debug("User account already exists");
                    resolve()
                } else {
                    console.debug("User account does not already exist, creating...");
                    initializeUserAccount(context, exchangeUuid).then((_) => {
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
 * @param exchangeUuid UUID of the exchange
 */
async function createSerumMarkets(context: Context, exchangeUuid: string): Promise<PublicKey[]> {
    let createdMarkets: PublicKey[] = [];
    // Intentionally do this the slow way because creating the serum markets is a super expensive process -
    // if there's a problem, we want to know before we've committed all our capital
    for (let i = 0; i < SERUM_MARKETS; i++) {
        try {
            let res = await initializeSerumMarket(context, exchangeUuid);
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
 * @param uuid Optionally, supply a UUID to create the exchagne account under. The UUID in constants will otherwise
 *             be used
 */
export default function boostrap(context: Context,
                                 uuid?: string): Promise<InstructionResult<BootstrapResult>> {
    let exchangeUuid = uuid || OPTIFI_EXCHANGE_ID[context.endpoint];
    return new Promise((resolve, reject) => {
        // Find or create the addresses of both the exchange and user accounts,
        // and make sure that our user is an authority
        console.debug("Finding or initializing a new Optifi exchange...")
        createOrFetchExchange(context, exchangeUuid).then(() => {
            findExchangeAccount(context, exchangeUuid).then(([exchangeAddress, _]) => {
                createUserAccountIfNotExist(context, exchangeUuid).then(() => {
                    findUserAccount(context, exchangeUuid).then(([accountAddress, _]) => {
                        // Now that we have both addresses, create as many new serum markets
                        // as are specified in the constants
                        createSerumMarkets(context, exchangeUuid).then((marketKeys) => {
                            // TODO: for each of the new serum markets, create a new instrument, and a new Optifi market
                        }).catch((err) => reject(err))
                    })
                }).catch((err) => reject(err));
            })
        }).catch((err) => reject(err))
    })
}