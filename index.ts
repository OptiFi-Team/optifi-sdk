import * as anchor from "@project-serum/anchor";
import {Connection, Keypair} from "@solana/web3.js";
import Context from "./types/context";
import {OPTIFI_EXCHANGE_ID, SolanaEndpoint} from "./constants";
import {isWalletProvider, readJsonFile} from './utils/generic';
import {OptifiExchangeIDL} from './types/optifi-exchange-types';
import optifiExchange from './idl/optifi_exchange.json';
import {MathWallet, SlopeWallet, SolongWallet, SolWindow, WalletProvider} from './types/solanaTypes';
import WalletType from "./types/walletType";

//instructions
import deposit from './instructions/deposit';
import withdraw from './instructions/withdraw';
import initialize from './instructions/initialize';
import initializeUserAccount from './instructions/initializeUserAccount';
import initializeSerumMarket from './instructions/initializeSerumMarket';

require('dotenv').config();

interface WalletContext {
    walletType: WalletType,
    anchorWallet: anchor.Wallet
}

/**
 * On the frontend, resolve an injected wallet from the window.solana object
 *
 * @param wallet The wallet provider already resolved
 */
function getWalletWrapper(wallet: WalletProvider): Promise<WalletContext> {
    return new Promise((resolve, reject) => {
        let walletType: WalletType;
        // Cast solana injected window type
        const solWindow = window as unknown as SolWindow;
        let walletWrapper: anchor.Wallet | SolongWallet | MathWallet | SlopeWallet = solWindow.solana as unknown as anchor.Wallet;

        // Wallet adapter or injected wallet setup
        if(wallet.name === 'Slope' && !!solWindow.Slope) {
            walletType = WalletType.Slope;
            walletWrapper = new solWindow.Slope() as unknown as SlopeWallet;
            walletWrapper.connect().then(({data}) => {
                if (data.publicKey) {
                    // @ts-ignore
                    (walletWrapper as SlopeWallet).publicKey = new anchor.web3.PublicKey(data.publicKey);
                }
                // @ts-ignore
                walletWrapper.on = (action: string, callback: any) => {
                    if (callback) callback()
                };
                resolve({
                    walletType: walletType,
                    anchorWallet: walletWrapper as unknown as anchor.Wallet
                })
            }).catch((err) => reject(err))
        } else if (wallet.name === 'Solong' && solWindow.solong) {
            walletType = WalletType.Solong;
            walletWrapper = solWindow.solong as unknown as SolongWallet;
            solWindow.solong.selectAccount().then((key) => {
                (walletWrapper as SolongWallet).publicKey = new anchor.web3.PublicKey(key);
                // @ts-ignore
                walletWrapper.on = (action: string, callback: Function) => {if (callback) callback()};
                // @ts-ignore
                walletWrapper.connect = (action: string, callback: Function) => {if (callback) callback()};
                resolve({
                    walletType: walletType,
                    anchorWallet: walletWrapper as unknown as anchor.Wallet
                })
            }).catch((err) => reject(err))
        } else if (wallet.name === 'Math Wallet' && solWindow.solana?.isMathWallet) {
            walletType = WalletType.Math;
            walletWrapper = solWindow.solana as unknown as MathWallet;
            solWindow.solana.getAccount().then((key) => {
                (walletWrapper as MathWallet).publicKey = new anchor.web3.PublicKey(key);
                // @ts-ignore
                walletWrapper.on = (action: string, callback: any) => {if (callback) callback()};
                // @ts-ignore
                walletWrapper.connect = (action: string, callback: any) => {if (callback) callback()};
                resolve({
                    walletType: walletType,
                    anchorWallet: walletWrapper as unknown as anchor.Wallet
                })
            })
        }
        else {
            if (wallet.name === 'Phantom' && solWindow.solana?.isPhantom) {
                walletType = WalletType.Phantom;
                walletWrapper = solWindow.solana as unknown as anchor.Wallet;
            } else if (wallet.name === 'Solflare' && solWindow.solflare?.isSolflare) {
                walletType = WalletType.Solflare;
                walletWrapper = solWindow.solflare as unknown as anchor.Wallet;
            } else {
                walletType = WalletType.Unknown;
                console.error("Unsupported wallet provider ", wallet);
                reject("Unsupported wallet provider");
            }
            resolve({
                walletType: walletType,
                anchorWallet: walletWrapper as unknown as anchor.Wallet
            })
        }
    });
}

/**
 * Initialize a context to use the SDK with, given a wallet and a program ID
 *
 * @param wallet The user's wallet, to transact with the system. Can either be a string, specifying a path to a wallet,
 * or an already initialized Wallet Provider. If a wallet is not provided, will try to read one in from the path in
 * the environment variable process.env.OPTIFI_WALLET
 *
 * @param optifiProgramId The ID of the on chain Optifi program. If not provided, will try to read in from
 * process.env.OPTIFI_PROGRAM_ID
 *
 * @param customExchangeUUID Optionally supply a custom UUID for the exchange, instead of using the Optifi
 * constant
 *
 * @param endpoint The Solana cluster to connect to. Devnet by default
 */
function initializeContext(wallet?: string | WalletProvider,
                           optifiProgramId?: string,
                           customExchangeUUID?: string,
                           endpoint: SolanaEndpoint = SolanaEndpoint.Devnet): Promise<Context> {
    let uuid = customExchangeUUID || OPTIFI_EXCHANGE_ID[endpoint];
    return new Promise((resolve, reject) => {

        // If the wallet was a provider object, figure out it's type for later specifics of transaction signing,
        // and build the anchor wallet object
        if (wallet !== undefined && isWalletProvider(wallet)) {

            getWalletWrapper(wallet).then((walletRes) => {
                const connection = new Connection(endpoint);
                const provider = new anchor.Provider(connection,
                    walletRes.anchorWallet,
                    anchor.Provider.defaultOptions());
                const program = new anchor.Program(optifiExchange as OptifiExchangeIDL,
                    (optifiProgramId || (process.env.OPTIFI_PROGRAM_ID as string)),
                    provider)
                resolve({
                    program: program,
                    walletType: walletRes.walletType,
                    provider: provider,
                    endpoint: endpoint,
                    connection: connection,
                    exchangeUUID: uuid
                })
            }).catch((err) => reject(err))

        // Otherwise, try to read in a keypair from an environment variable, or a specified string
        } else {
            let keypair: Keypair;
            console.log("Optifi wallet is ", process.env.OPTIFI_WALLET, " wallet is ", wallet);
            if (wallet === undefined) {
                keypair = Keypair.fromSecretKey(new Uint8Array(readJsonFile<any>(process.env.OPTIFI_WALLET as string)))
            } else {
                // Initialize the wallet
                // The wallet was provided as a path
                keypair = Keypair.fromSecretKey(new Uint8Array(readJsonFile<any>(wallet)));
            }
            const idl = readJsonFile<OptifiExchangeIDL>("idl/optifi_exchange.json");
            const connection = new Connection(endpoint);
            const walletWrapper = new anchor.Wallet(keypair);
            const provider = new anchor.Provider(connection, walletWrapper, anchor.Provider.defaultOptions());
            const program = new anchor.Program(idl,
                (optifiProgramId || (process.env.OPTIFI_PROGRAM_ID as string)),
                provider)

            resolve({
                program: program,
                provider: provider,
                endpoint: endpoint,
                connection: connection,
                walletType: WalletType.Keypair,
                walletKeypair: keypair,
                exchangeUUID: uuid
            })
        }
    })   
}

export {initializeContext, deposit, withdraw, initialize, initializeSerumMarket, initializeUserAccount }
