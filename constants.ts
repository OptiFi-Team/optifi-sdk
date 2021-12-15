export enum SolanaEndpoint {
    Mainnet = "https://api.mainnet-beta.solana.com",
    Devnet = "https://api.devnet.solana.com",
    Testnet = "https://api.testnet.solana.com"
}

export const USER_ACCOUNT_PREFIX: string = "user_account";

export type EndpointConstant = {
    [endpoint in SolanaEndpoint]: any;
}

export const USDC_TOKEN_MINT: EndpointConstant = {
    "https://api.mainnet-beta.solana.com": "2wmVCSfPxGPjrnMMn7rchp4uaeoTqN39mXFC2zhPdri9",
    "https://api.devnet.solana.com": "EyvvsvLH53EkdWK7orfBuoYdaN7hG1oVEbVbRw4AbEzW",
    "https://api.testnet.solana.com": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
}

export const SWITCHBOARD: EndpointConstant = {
    "https://api.mainnet-beta.solana.com": {
        SWITCHBOARD_MAINNET_BTC_USD:  "74YzQPGUT9VnjrBz8MuyDLKgKpbDqGot5xZJvTtMi6Ng",
        SWITCHBOARD_MAINNET_BTC_IV: "CX1PvW4qUDy4PPq8egnMVCbVJt8TcPCt7WCZuwmvCfo7",
        SWITCHBOARD_MAINNET_ETH_USD: "QJc2HgGhdtW4e7zjvLB1TGRuwEpTre2agU5Lap2UqYz",
        SWITCHBOARD_MAINNET_ETH_IV: "4AGPMUEfBCSNqVd4Y6veHAep6VPtrkMa89rBhPqMYegz",
    },
    "https://api.devnet.solana.com": {
        SWITCHBOARD_DEVNET_BTC_USD: "74YzQPGUT9VnjrBz8MuyDLKgKpbDqGot5xZJvTtMi6Ng",
        SWITCHBOARD_DEVNET_BTC_IV: "CX1PvW4qUDy4PPq8egnMVCbVJt8TcPCt7WCZuwmvCfo7",
        SWITCHBOARD_DEVNET_ETH_USD: "QJc2HgGhdtW4e7zjvLB1TGRuwEpTre2agU5Lap2UqYz",
        SWITCHBOARD_DEVNET_ETH_IV: "4AGPMUEfBCSNqVd4Y6veHAep6VPtrkMa89rBhPqMYegz",
    },
    "https://api.testnet.solana.com": {

    }
}