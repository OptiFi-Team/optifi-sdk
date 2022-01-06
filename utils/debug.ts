import Context from "../types/context";
import {SolanaEndpoint} from "../constants";
import {findUserAccount} from "./accounts";

export enum SolanaEntityType {
    Transaction = "tx",
    Account = "address",
    Block = "block"
}

/**
 * Return a solana explorer URL for a transaction, to aid in debugging
 *
 * @param context Program context
 * @param entity The entity to generate the explorer URL for
 * @param entity_type The
 */
export function formatExplorerAddress(context: Context,
                                      entity: string,
                                      entity_type: SolanaEntityType): string {
    let suffix: string;
    switch (context.endpoint) {
        case SolanaEndpoint.Mainnet:
            suffix = '';
            break;
        case SolanaEndpoint.Devnet:
            suffix = '?cluster=devnet';
            break;
        case SolanaEndpoint.Testnet:
            suffix = '?cluster=testnet';
            break;
    }

    return `https://explorer.solana.com/${entity_type}/${entity}${suffix}`;
}


export function logUserAccount(context: Context): Promise<void> {
    return new Promise(() => {
      findUserAccount(context).then(([account, _]) => {
        console.log(`User account: ${formatExplorerAddress(context, account.toString(), SolanaEntityType.Account)}`)
      })
    })
}

export function logFormatted(items: { [item: string]: any}) {
    let logStr = '';
    for (let item of Object.keys(items)) {
        logStr += `${item}: ${items[item]}\n`
    }
    console.log(logStr);
}