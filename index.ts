import * as anchor from "@project-serum/anchor";
import {Connection, Keypair} from "@solana/web3.js";
import Context from "./types/context";
import {SolanaEndpoint} from "./constants";
import {readJsonFile} from "./utils/generic";
import {OptifiExchangeIDL} from "./types/optifi-exchange-types";

/**
 * Initialize a context to use the SDK with, given a wallet and a program ID
 *
 * @param wallet The user's wallet, to transact with the system. Can either be a string, specifying a path to a wallet,
 * or an already initialized keypair. If a wallet is not provided, will try to read one in from the path in
 * the environment variable process.env.OPTIFI_WALLET
 *
 * @param optifiProgramId The ID of the on chain Optifi program. If not provided, will try to read in from
 * process.env.OPTIFI_PROGRAM_ID
 *
 * @param endpoint The Solana cluster to connect to. Devnet by default
 */
export function initializeContext(wallet?: string | Keypair,
                                  optifiProgramId?: string,
                                  endpoint: SolanaEndpoint = SolanaEndpoint.Devnet): Context {
    let keypair: Keypair;
    if (wallet === undefined) {
        keypair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(readJsonFile<any>(process.env.OPTIFI_WALLET as string)))
    } else {
        // Initialize the wallet
        if (typeof (wallet) == "string") {
            // The wallet was provided as a path
            keypair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(readJsonFile<any>(wallet)));
        } else {
            keypair = wallet;
        }
    }

    const idl = readJsonFile<OptifiExchangeIDL>("idl/optifi_exchange.json");
    const connection = new Connection(endpoint);
    const walletWrapper = new anchor.Wallet(keypair);
    const provider = new anchor.Provider(connection, walletWrapper, anchor.Provider.defaultOptions());
    const program = new anchor.Program(idl,
        (optifiProgramId || (process.env.OPTIFI_PROGRAM_ID as string)),
        provider)

    return {
        program: program,
        user: keypair,
        endpoint: endpoint
    }
}