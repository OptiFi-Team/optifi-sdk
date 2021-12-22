import * as anchor from "@project-serum/anchor";
import {Connection, Keypair} from "@solana/web3.js";
import Context from "./types/context";
import {SolanaEndpoint} from "./constants";
import { isWalletProvider, readJsonFile } from './utils/generic';
import { OptifiExchangeIDL } from './types/optifi-exchange-types';
import optifiExchange from './idl/optifi_exchange.json';
import { WalletProvider, MathWallet, SlopeWallet, SolWindow, SolongWallet } from './types/solanaTypes';
require('dotenv').config();

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
 * @param endpoint The Solana cluster to connect to. Devnet by default
 */
export async function initializeContext(wallet?: string | WalletProvider,
                                  optifiProgramId?: string,
                                  endpoint: SolanaEndpoint = SolanaEndpoint.Devnet): Promise<Context> {

    if (wallet !== undefined && isWalletProvider(wallet)) {
        // Cast solana injected window type
        const solWindow = window as unknown as SolWindow;
        let walletWrapper: anchor.Wallet | SolongWallet | MathWallet | SlopeWallet = solWindow.solana as unknown as anchor.Wallet;
        // Wallet adapter or injected wallet setup
        if (wallet.name === 'Phantom' && solWindow.solana?.isPhantom) {
            walletWrapper = solWindow.solana as unknown as anchor.Wallet;
        } else if (wallet.name === 'Solflare' && solWindow.solflare?.isSolflare) {
            walletWrapper = solWindow.solflare as unknown as anchor.Wallet;
        } else if(wallet.name === 'Slope' && !!solWindow.Slope) {
            walletWrapper = new solWindow.Slope() as unknown as SlopeWallet;
            const { data } = await walletWrapper.connect();
            if(data.publicKey) {
                walletWrapper.publicKey = new anchor.web3.PublicKey(data.publicKey);
            }
            walletWrapper.on = (action: string, callback: any) => {if (callback) callback()};

        } else if (wallet.name === 'Math Wallet' && solWindow.solana?.isMathWallet) {
            walletWrapper = solWindow.solana as unknown as MathWallet;
            walletWrapper.publicKey = new anchor.web3.PublicKey(await solWindow.solana.getAccount());
            walletWrapper.on = (action: string, callback: any) => {if (callback) callback()};
            walletWrapper.connect = (action: string, callback: any) => {if (callback) callback()};
        } else if (wallet.name === 'Solong' && solWindow.solong) {
            walletWrapper = solWindow.solong as unknown as SolongWallet;
            walletWrapper.publicKey = new anchor.web3.PublicKey(await solWindow.solong.selectAccount());
            walletWrapper.on = (action: string, callback: Function) => {if (callback) callback()};
            walletWrapper.connect = (action: string, callback: Function) => {if (callback) callback()};
        }

        const connection = new Connection(endpoint);
        const provider = new anchor.Provider(connection, walletWrapper as unknown as anchor.Wallet, anchor.Provider.defaultOptions());
        const program = new anchor.Program(optifiExchange as OptifiExchangeIDL,
            (optifiProgramId || (process.env.OPTIFI_PROGRAM_ID as string)),
            provider)

        return {
            program: program,
            //user: provider,
            endpoint: endpoint,
            connection: connection
        }  

    } else {
        let keypair: Keypair;
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

        return {
            program: program,
            user: keypair,
            endpoint: endpoint,
            connection: connection
        }   
    }
    
    
    
}