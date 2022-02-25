import Asset from "./types/asset";
import InstrumentType from "./types/instrumentType";
import ExpiryType from "./types/expiryType";
import MaturityType from "./types/maturityType";
import { Duration } from "./types/optifi-exchange-types";

export enum SolanaEndpoint {
    Mainnet = "https://api.mainnet-beta.solana.com",
    Devnet = "https://api.devnet.solana.com",
    Testnet = "https://api.testnet.solana.com"
}

// Constant prefixes for account seeds
export const USER_ACCOUNT_PREFIX: string = "user_account";
export const USER_TOKEN_ACCOUNT_PDA: string = "user_token_account_pda";
export const EXCHANGE_PREFIX: string = "optifi_exchange";
export const INSTRUMENT_PREFIX: string = "instrument";
export const OPTIFI_MARKET_PREFIX: string = "optifi_market";
export const OPTIFI_MARKET_MINT_AUTH_PREFIX: string = "optifi_market_mint_auth";
export const USDC_CENTRAL_POOL_PREFIX: string = "central_usdc_pool";
export const USDC_POOL_AUTH_PREFIX: string = "central_usdc_pool_auth";
export const SERUM_OPEN_ORDERS_PREFIX: string = "serum_open_orders";
export const SERUM_MARKET_AUTHORITY: string = "serum_market_auth";
export const SERUM_PRUNE_AUTHORITY: string = "serum_prune_auth";
export const AMM_PREFIX: string = "amm";
export const AMM_LIQUIDITY_AUTH_PREFIX: string = "amm_liquidity_auth";
export const MARKET_MAKER_PREFIX: string = "market_maker";
export const LIQUIDATION_STATE_PREFIX: string = "liquidation_state";

// Size of the strike ladder
export const STRIKE_LADDER_SIZE: number = 9;

// AMM Trade capacity
export const AMM_TRADE_CAPACITY = 25;

// How many assets are supported, should be in the same sequence as enum
export const SUPPORTED_ASSETS: Asset[] = [Asset.Bitcoin, Asset.Ethereum];

// How many duration are supported
export const SUPPORTED_DURATION: Duration[] = [Duration.Weekly, Duration.Monthly];

//How many instrument types are supported
export const SUPPORTED_INSTRUMENTS: InstrumentType[] = [InstrumentType.Put, InstrumentType.Call];

type ExpirationMapping = {
    [instrumentType in InstrumentType]: ExpiryType[]
}
// What expiration types we're currently supporting for each instrument
export const SUPPORTED_EXPIRATION_TYPES: ExpirationMapping = {
    // Puts
    0: [
        ExpiryType.Standard
    ],
    // Calls
    1: [
        ExpiryType.Standard
    ],
    // Futures
    // 2: [
    //     ExpiryType.Perpetual
    // ]
}

// We want our maturities to end on Wednesdays, 2:00PM UTC
export const EXPIRATION_WEEKDAY: number = 3;
export const EXPIRATION_TIME: number = 14;

export const SECONDS_IN_YEAR: number = (60 * 60) * 24 * 365;

// The expiration durations we're supporting for standard expiries
export const SUPPORTED_MATURITIES = [
    MaturityType.Weekly,
    MaturityType.Monthly
]


export function calculateSerumMarketsCount(): number {
    let totalMarkets = 0;

    for (let instrumentType of Object.keys(SUPPORTED_EXPIRATION_TYPES)) {
        let supportedExpirations: ExpiryType[] = SUPPORTED_EXPIRATION_TYPES[Number(instrumentType) as InstrumentType];
        for (let supportedExpiryType of supportedExpirations) {
            switch (supportedExpiryType) {
                case ExpiryType.Perpetual:
                    totalMarkets += 1;
                    break;
                case ExpiryType.Standard:
                    totalMarkets += SUPPORTED_MATURITIES.length;
                    break;
            }
        }
    }

    totalMarkets *= SUPPORTED_ASSETS.length;
    totalMarkets *= STRIKE_LADDER_SIZE;

    console.debug(`${totalMarkets} total serum markets`);

    return totalMarkets;
}

// How many serum markets the program should keep
export const SERUM_MARKETS: number = calculateSerumMarketsCount();

export type EndpointConstant = {
    [endpoint in SolanaEndpoint]: any;
}

export const USDC_TOKEN_MINT: EndpointConstant = {
    "https://api.mainnet-beta.solana.com": "2wmVCSfPxGPjrnMMn7rchp4uaeoTqN39mXFC2zhPdri9",
    "https://api.devnet.solana.com": "6H2zescZeVfaJwBkM2jKiKWrAG5yfDAfb3CyJFDXDZE5",
    "https://api.testnet.solana.com": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
}

export const OPTIFI_EXCHANGE_ID: EndpointConstant = {
    "https://api.devnet.solana.com": "111171",
    "https://api.testnet.solana.com": "dmeWlh",
    "https://api.mainnet-beta.solana.com": "dmeWlh",
}

export const SWITCHBOARD: EndpointConstant = {
    "https://api.mainnet-beta.solana.com": {
        SWITCHBOARD_BTC_USD: "74YzQPGUT9VnjrBz8MuyDLKgKpbDqGot5xZJvTtMi6Ng",
        SWITCHBOARD_BTC_IV: "CX1PvW4qUDy4PPq8egnMVCbVJt8TcPCt7WCZuwmvCfo7",
        SWITCHBOARD_ETH_USD: "QJc2HgGhdtW4e7zjvLB1TGRuwEpTre2agU5Lap2UqYz",
        SWITCHBOARD_ETH_IV: "4AGPMUEfBCSNqVd4Y6veHAep6VPtrkMa89rBhPqMYegz",
        SWITCHBOARD_USDC_USD: "CZx29wKMUxaJDq6aLVQTdViPL754tTR64NAgQBUGxxHb",
    },
    "https://api.devnet.solana.com": {
        SWITCHBOARD_BTC_USD: "74YzQPGUT9VnjrBz8MuyDLKgKpbDqGot5xZJvTtMi6Ng",
        SWITCHBOARD_BTC_IV: "CX1PvW4qUDy4PPq8egnMVCbVJt8TcPCt7WCZuwmvCfo7",
        SWITCHBOARD_ETH_USD: "QJc2HgGhdtW4e7zjvLB1TGRuwEpTre2agU5Lap2UqYz",
        SWITCHBOARD_ETH_IV: "4AGPMUEfBCSNqVd4Y6veHAep6VPtrkMa89rBhPqMYegz",
        SWITCHBOARD_USDC_USD: "CZx29wKMUxaJDq6aLVQTdViPL754tTR64NAgQBUGxxHb"
    },
    "https://api.testnet.solana.com": {
        SWITCHBOARD_BTC_USD: "74YzQPGUT9VnjrBz8MuyDLKgKpbDqGot5xZJvTtMi6Ng",
        SWITCHBOARD_BTC_IV: "CX1PvW4qUDy4PPq8egnMVCbVJt8TcPCt7WCZuwmvCfo7",
        SWITCHBOARD_ETH_USD: "QJc2HgGhdtW4e7zjvLB1TGRuwEpTre2agU5Lap2UqYz",
        SWITCHBOARD_ETH_IV: "4AGPMUEfBCSNqVd4Y6veHAep6VPtrkMa89rBhPqMYegz",
        SWITCHBOARD_USDC_USD: "CZx29wKMUxaJDq6aLVQTdViPL754tTR64NAgQBUGxxHb"
    }
}

export const SERUM_DEX_PROGRAM_ID: EndpointConstant = {
    "https://api.mainnet-beta.solana.com": "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
    "https://api.devnet.solana.com": "DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY",
    "https://api.testnet.solana.com": "DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY"
}

// Associated token program is constant across all of the clusters
export const ASSOCIATED_TOKEN_PROGRAM_ID: string = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"

// Serum market constants
export const COIN_LOT_SIZE: number = 1; // let's set 1 as one instrument spl token represents 1 contract
export const PC_LOT_SIZE: number = 1;
export const PC_DUST_THRESHOLD: number = 2;

export const MAX_COIN_QTY = 500 * COIN_LOT_SIZE;
export const MAX_PC_QTY = 1000 * PC_LOT_SIZE;