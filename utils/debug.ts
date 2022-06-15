import Context from "../types/context";
import { SolanaEndpoint } from "../constants";
import { findUserAccount } from "./accounts";
import { PublicKey } from "@solana/web3.js";
import { IdlAccount } from "@project-serum/anchor/src/idl";

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

export function logFormatted(items: { [item: string]: any }) {
    let logStr = '';
    for (let item of Object.keys(items)) {
        logStr += `${item}: ${items[item]}\n`
    }
    console.log(logStr);
}


/**
 * Helper function to debug a serialized on chain anchor account by looking at it's data, discriminator, etc.
 *
 * @param context Program context
 * @param address Address of the account to debug
 * @param account The anchor account type to debug
 */
export function debugAnchorAccount(context: Context,
    address: PublicKey,
    account: IdlAccount,): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log(`Loading account ${address.toString()}, ${formatExplorerAddress(context,
            address.toString(),
            SolanaEntityType.Account)}...`);
        context.connection.getAccountInfo(address).then((acctInfo) => {
            if (acctInfo === null) {
                console.log(`Account at ${address.toString()} did not exist, or could not be retrieved yet`);
            } else {
                console.log("Expected account name is ", account.name);
                console.log("Account data is - ", acctInfo.data);
                let actualDiscriminator = acctInfo.data.slice(0, 8)
                console.log("Discriminator bytes are ", actualDiscriminator);
                // Try to decode anyway
                let accountsCoder = context.program.coder.accounts;
                let res = accountsCoder.decode(account.name, acctInfo.data)
                console.log("Decode result ", res);
            }
        })
    })
}