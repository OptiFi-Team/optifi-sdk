import { Cluster, PublicKey } from "@solana/web3.js";
import { PYTH, SolanaCluster, } from "../constants";
import { PythHttpClient, parsePriceData, parseBaseData, AccountType, getPythProgramKeyForCluster } from "@pythnetwork/client"
import Context from "../types/context";
import { resolve } from "path";


/*
 * Customized pyth helper for get single asset spot price
 * Get Pyth Network account information and return actual price state.
 * The result contains lists of asset types, product symbols and their prices.
 */
export async function getPythData(context: Context, priceAccountKey: PublicKey): Promise<number> {
    let cluster = convertSolanaCulsterToCluster(context.cluster)
    const programKey = getPythProgramKeyForCluster(cluster)
    const client = new PythHttpClient(context.connection, programKey, "recent");

    // Retrieve data from blockchain
    const accountInfoRaw = await client.connection.getAccountInfo(priceAccountKey, client.commitment)
    const currentSlot = await client.connection.getSlot(client.commitment)
    let priceData
    const base = parseBaseData(accountInfoRaw!.data)
    if (base) {
        switch (base.type) {
            case AccountType.Price:
                priceData = parsePriceData(accountInfoRaw!.data, currentSlot)
                break
            default:
                throw new Error(`Unknown account type: ${base.type}. Try upgrading pyth-client.`)
        }
    }

    if (priceData && (priceData.price || priceData.aggregate.price)) {
        let result = priceData.price || priceData.aggregate.price
        return result
    } else {
        throw new Error(`failed to fetch pyth oracle data`);
    }
}


export function convertSolanaCulsterToCluster(solanaCluster: SolanaCluster): Cluster {

    let cluster: Cluster
    switch (solanaCluster) {
        case SolanaCluster.Mainnet:
            cluster = "mainnet-beta"
            break;
        case SolanaCluster.Devnet:
            cluster = "devnet"
            break;
        case SolanaCluster.Testnet:
            cluster = "testnet"
            break;
        default:
            throw Error("unknown cluster")
    }
    return cluster
}

export function getSpotPrice(context: Context, asset: number): Promise<number> {
    switch (asset) {
        case 0:
            return getPythData(context, new PublicKey(PYTH[context.cluster].BTC_USD));
        case 1:
            return getPythData(context, new PublicKey(PYTH[context.cluster].ETH_USD));
        case 2:
            return getPythData(context, new PublicKey(PYTH[context.cluster].USDC_USD));
        case 3:
            return getPythData(context, new PublicKey(PYTH[context.cluster].SOL_USD));;
        default:
            return new Promise((resolve, reject) => {
                reject()
            })
    }
}

