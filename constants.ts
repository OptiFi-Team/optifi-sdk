import Asset from "./types/asset";
import InstrumentType from "./types/instrumentType";

export enum SolanaEndpoint {
    Mainnet = "https://api.mainnet-beta.solana.com",
    Devnet = "https://api.devnet.solana.com",
    Testnet = "https://api.testnet.solana.com"
}

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

// Size of the strike ladder
export const STRIKE_LADDER_SIZE: number = 9;

// How many assets are supported
export const SUPPORTED_ASSETS: Asset[] = [Asset.Ethereum, Asset.Bitcoin];

//How many instrument types are supported
export const SUPPORTED_INSTRUMENTS: InstrumentType[] = [InstrumentType.Put, InstrumentType.Call, InstrumentType.Future];

// How many serum markets the program should keep
export const SERUM_MARKETS: number = SUPPORTED_INSTRUMENTS.length * SUPPORTED_ASSETS.length * STRIKE_LADDER_SIZE;

export type EndpointConstant = {
    [endpoint in SolanaEndpoint]: any;
}

export const USDC_TOKEN_MINT: EndpointConstant = {
    "https://api.mainnet-beta.solana.com": "2wmVCSfPxGPjrnMMn7rchp4uaeoTqN39mXFC2zhPdri9",
    "https://api.devnet.solana.com": "71bkrU4PprY2vf8yodAJpaVAdwoiTcTGpTARpKfLDumf",
    "https://api.testnet.solana.com": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
}

export const OPTIFI_EXCHANGE_ID: EndpointConstant = {
    "https://api.devnet.solana.com" : "skRvEx",
    "https://api.testnet.solana.com": "dmeWlh",
    "https://api.mainnet-beta.solana.com": "dmeWlh",
}

export const SWITCHBOARD: EndpointConstant = {
    "https://api.mainnet-beta.solana.com": {
        SWITCHBOARD_BTC_USD:  "74YzQPGUT9VnjrBz8MuyDLKgKpbDqGot5xZJvTtMi6Ng",
        SWITCHBOARD_BTC_IV: "CX1PvW4qUDy4PPq8egnMVCbVJt8TcPCt7WCZuwmvCfo7",
        SWITCHBOARD_ETH_USD: "QJc2HgGhdtW4e7zjvLB1TGRuwEpTre2agU5Lap2UqYz",
        SWITCHBOARD_ETH_IV: "4AGPMUEfBCSNqVd4Y6veHAep6VPtrkMa89rBhPqMYegz",
    },
    "https://api.devnet.solana.com": {
        SWITCHBOARD_BTC_USD: "74YzQPGUT9VnjrBz8MuyDLKgKpbDqGot5xZJvTtMi6Ng",
        SWITCHBOARD_BTC_IV: "CX1PvW4qUDy4PPq8egnMVCbVJt8TcPCt7WCZuwmvCfo7",
        SWITCHBOARD_ETH_USD: "QJc2HgGhdtW4e7zjvLB1TGRuwEpTre2agU5Lap2UqYz",
        SWITCHBOARD_ETH_IV: "4AGPMUEfBCSNqVd4Y6veHAep6VPtrkMa89rBhPqMYegz",
    },
    "https://api.testnet.solana.com": {
        SWITCHBOARD_BTC_USD: "74YzQPGUT9VnjrBz8MuyDLKgKpbDqGot5xZJvTtMi6Ng",
        SWITCHBOARD_BTC_IV: "CX1PvW4qUDy4PPq8egnMVCbVJt8TcPCt7WCZuwmvCfo7",
        SWITCHBOARD_ETH_USD: "QJc2HgGhdtW4e7zjvLB1TGRuwEpTre2agU5Lap2UqYz",
        SWITCHBOARD_ETH_IV: "4AGPMUEfBCSNqVd4Y6veHAep6VPtrkMa89rBhPqMYegz",
    }
}

export const SERUM_DEX_PROGRAM_ID: EndpointConstant = {
    "https://api.mainnet-beta.solana.com": "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
    "https://api.devnet.solana.com": "DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY",
    "https://api.testnet.solana.com": "DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY"
}