import Asset from "./types/asset";
import InstrumentType from "./types/instrumentType";
import ExpiryType from "./types/expiryType";
import MaturityType from "./types/maturityType";
import { Duration } from "./types/optifi-exchange-types";
import { PublicKey } from "@solana/web3.js";

export enum SolanaEndpoint {
    Mainnet = "https://solana-api.projectserum.com",
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
export const PREFIX_MARGIN_STRESS: string = "margin_stress";

// Size of the strike ladder
export const STRIKE_LADDER_SIZE: number = 5;

// AMM Trade capacity
export const AMM_TRADE_CAPACITY = 25;

// How many assets are supported, should be in the same sequence as enum
export const SUPPORTED_ASSETS: Asset[] = [Asset.Bitcoin, Asset.Ethereum];

// How many duration are supported
export const SUPPORTED_DURATION: Duration[] = [Duration.Weekly, Duration.Monthly];

// The expiration durations we're supporting for standard expiries
export const SUPPORTED_MATURITIES = [
    MaturityType.Weekly
]

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

// We want our maturities to end on Friday, 8:00PM UTC as same as Deribit
export const EXPIRATION_WEEKDAY: number = 5;
export const EXPIRATION_TIME: number = 8;

export const SECONDS_IN_YEAR: number = (60 * 60) * 24 * 365;

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
    "https://solana-api.projectserum.com": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "https://api.devnet.solana.com": "8FRFC6MoGGkMFQwngccyu69VnYbzykGeez7ignHVAFSN",
    "https://api.testnet.solana.com": "8FRFC6MoGGkMFQwngccyu69VnYbzykGeez7ignHVAFSN"
}

export const OPTIFI_EXCHANGE_ID: EndpointConstant = {
    "https://api.devnet.solana.com": "111317",
    "https://api.testnet.solana.com": "dmeWlh",
    "https://solana-api.projectserum.com": "dmeWlh",
}

export const SWITCHBOARD: EndpointConstant = {
    "https://solana-api.projectserum.com": {
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
    "https://solana-api.projectserum.com": "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
    "https://api.devnet.solana.com": "DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY",
    "https://api.testnet.solana.com": "DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY"
}

// Mango market program ids
// from https://github.com/blockworks-foundation/mango-client-v3/blob/main/src/ids.json
export const MANGO_PROGRAM_ID: EndpointConstant = {
    "https://solana-api.projectserum.com": "mv3ekLzLbnVPNxjSKvqBpU3ZeZXPQdEC3bp5MDEBG68",
    "https://api.devnet.solana.com": "4skJ85cdxQAFVKbcGgfun8iZPL7BadVYXG3kGEGkufqA",
    "https://api.testnet.solana.com": "4skJ85cdxQAFVKbcGgfun8iZPL7BadVYXG3kGEGkufqA"
}

// Mango group pubkey
export const MANGO_GROUP_ID: EndpointConstant = {
    "https://solana-api.projectserum.com": "98pjRuQjK3qA6gXts96PqZT4Ze5QmnCmt3QYjhbUSPue",
    "https://api.devnet.solana.com": "Ec2enZyoC4nGpEfu2sUNAa2nUGJHWxoUWYSEJ2hNTWTA",
    "https://api.testnet.solana.com": "Ec2enZyoC4nGpEfu2sUNAa2nUGJHWxoUWYSEJ2hNTWTA"
}

// Mango usdc token
export const MANGO_USDC_CONFIG: EndpointConstant = {
    "https://solana-api.projectserum.com": {
        "symbol": "USDC",
        "mintKey": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "decimals": 6,
        "rootKey": "AMzanZxMirPCgGcBoH9kw4Jzi9LFMomyUCXbpzDeL2T8",
        "nodeKeys": ["BGcwkj1WudQwUUjFk78hAjwd1uAm8trh1N4CJSa51euh"]
    },
    "https://api.devnet.solana.com": {
        "symbol": "USDC",
        "mintKey": "8FRFC6MoGGkMFQwngccyu69VnYbzykGeez7ignHVAFSN",
        "decimals": 6,
        "rootKey": "HUBX4iwWEUK5VrXXXcB7uhuKrfT4fpu2T9iZbg712JrN",
        "nodeKeys": ["J2Lmnc1e4frMnBEJARPoHtfpcohLfN67HdK1inXjTFSM"]
    },
    "https://api.testnet.solana.com": {
        "symbol": "USDC",
        "mintKey": "8FRFC6MoGGkMFQwngccyu69VnYbzykGeez7ignHVAFSN",
        "decimals": 6,
        "rootKey": "HUBX4iwWEUK5VrXXXcB7uhuKrfT4fpu2T9iZbg712JrN",
        "nodeKeys": ["J2Lmnc1e4frMnBEJARPoHtfpcohLfN67HdK1inXjTFSM"]
    },
}

// Mango usdc token
export const MANGO_PERP_MARKETS: EndpointConstant = {
    "https://solana-api.projectserum.com": [
        {
            "name": "BTC-PERP",
            "publicKey": "DtEcjPLyD4YtTBB4q8xwFZ9q49W89xZCZtJyrGebi5t8",
            "baseSymbol": "BTC",
            "baseDecimals": 6,
            "quoteDecimals": 6,
            "marketIndex": 1,
            "bidsKey": "Bc8XaK5UTuDSCBtiESSUxBSb9t6xczhbAJnesPamMRir",
            "asksKey": "BkWRiarqxP5Gwx7115LQPbjRmr3NjuSRXWBnduXXLGWR",
            "eventsKey": "7t5Me8RieYKsFpfLEV8jnpqcqswNpyWD95ZqgUXuLV8Z"
        },
        {
            "name": "ETH-PERP",
            "publicKey": "DVXWg6mfwFvHQbGyaHke4h3LE9pSkgbooDSDgA4JBC8d",
            "baseSymbol": "ETH",
            "baseDecimals": 6,
            "quoteDecimals": 6,
            "marketIndex": 2,
            "bidsKey": "DQv2sWhaHYbKrobHH6jAdkAXw13mnDdM9hVfRQtrUcMe",
            "asksKey": "8NhLMV6huneGAqijuUgUFSshbAfXxdNj6ZMHSLb9aW8K",
            "eventsKey": "9vDfKNPJkCvQv9bzR4JNTGciQC2RVHPVNMMHiVDgT1mw"
        }
    ],
    "https://api.devnet.solana.com": [
        {
            "name": "BTC-PERP",
            "publicKey": "FHQtNjRHA9U5ahrH7mWky3gamouhesyQ5QvpeGKrTh2z",
            "baseSymbol": "BTC",
            "baseDecimals": 6,
            "quoteDecimals": 6,
            "marketIndex": 1,
            "bidsKey": "F1Dcnq6F8NXR3gXADdsYqrXYBUUwoT7pfCtRuQWSyQFd",
            "asksKey": "BFEBZsLYmEhj4quWDRKbyMKhW1Q9c7gu3LqsnipNGTVn",
            "eventsKey": "Bu17U2YdBM9gRrqQ1zD6MpngQBb71RRAAn8dbxoFDSkU"
        },
        {
            "name": "ETH-PERP",
            "publicKey": "8jKPf3KJKWvvSbbYnunwZYv62UoRPpyGb93NWLaswzcS",
            "baseSymbol": "ETH",
            "baseDecimals": 6,
            "quoteDecimals": 6,
            "marketIndex": 2,
            "bidsKey": "6jGBscmZgRXk6oVLWbnQDpRftmzrDVu82TARci9VHKuW",
            "asksKey": "FXSvghvoaWFHRXzWUHi5tjK9YhgcPgMPpypFXBd4Aq3r",
            "eventsKey": "8WLv5fKLYkyZpFG74kRmp2RALHQFcNKmH7eJn8ebHC13"
        },
    ],
    "https://api.testnet.solana.com": {
        "symbol": "USDC",
        "mintKey": "8FRFC6MoGGkMFQwngccyu69VnYbzykGeez7ignHVAFSN",
        "decimals": 6,
        "rootKey": "HUBX4iwWEUK5VrXXXcB7uhuKrfT4fpu2T9iZbg712JrN",
        "nodeKeys": ["J2Lmnc1e4frMnBEJARPoHtfpcohLfN67HdK1inXjTFSM"]
    },
}


// Serum market constants
export const COIN_LOT_SIZE: number = 1; // let's set 1 as one instrument spl token represents 1 contract
export const PC_LOT_SIZE: number = 1;
export const PC_DUST_THRESHOLD: number = 2;

export const USDC_DECIMALS = 6;
export const SOL_DECIMALS = 9;


// // The fee for each transaction on the OptiFi system
// export const TAKER_FEE: number = 0.0010;
// export const SERUM_TAKER_FEE: number = 0.0004;
// export const OPTIFI_TAKER_FEE: number = 0.0006;
// // PostOnly order
// export const MAKER_FEE: number = 0.0006;
// export const SERUM_MAKER_FEE: number = 0.0;
// export const OPTIFI_MAKER_FEE: number = 0.0006;


// FOR DEVNET
// The fee for each transaction on the OptiFi system
export const TAKER_FEE: number = 0.0028;
export const SERUM_TAKER_FEE: number = 0.0022;
export const OPTIFI_TAKER_FEE: number = 0.0006;
// PostOnly order
export const MAKER_FEE: number = 0.0028;
export const SERUM_MAKER_FEE: number = 0.0022;
export const OPTIFI_MAKER_FEE: number = 0.0006;

// user margin deposit limit
export const DEPOSIT_LIMIT: number = 3000 * (10 ** USDC_DECIMALS);