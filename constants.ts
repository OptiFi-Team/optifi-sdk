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

// How many serum markets the program should keep
export const SERUM_MARKETS: number = 2;

export type EndpointConstant = {
    [endpoint in SolanaEndpoint]: any;
}

export const USDC_TOKEN_MINT: EndpointConstant = {
    "https://api.mainnet-beta.solana.com": "2wmVCSfPxGPjrnMMn7rchp4uaeoTqN39mXFC2zhPdri9",
    "https://api.devnet.solana.com": "2yran6ooPNw43UBrPQTygYopEwEpMKBL6dcTiLwd1YGR",
    "https://api.testnet.solana.com": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
}

export const OPTIFI_EXCHANGE_ID: EndpointConstant = {
    "https://api.devnet.solana.com" : "29wBWV",
    "https://api.testnet.solana.com": "29wBWV",
    "https://api.mainnet-beta.solana.com": "29wBWV",
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