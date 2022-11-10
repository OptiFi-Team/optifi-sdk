import { AccountInfo, Connection, PublicKey } from "@solana/web3.js"
import { splitToBatch } from "../scripts/amm/utils"

const MAX_ACCOUNTS_TO_FETCH = 100

/**
 * Fetch multiple accounts info without limit
 *
 * @param connection Connection to use
 * @param accountAddresses Account Addresses to fetch
 *
 * @return Multiple account infos
 */
export async function getMultipleAccountsInfoV2(connection: Connection, accountAddresses: PublicKey[]) {
    let batches = splitToBatch(accountAddresses, MAX_ACCOUNTS_TO_FETCH)
    let accountInfoBatchs = await Promise.all(batches.map(batch => connection.getMultipleAccountsInfo(batch)))
    let accountInfos: (AccountInfo<Buffer> | null)[] = []
    accountInfoBatchs.forEach(batch => {
        batch.forEach(e => {
            accountInfos.push(e)
        })
    })
    return accountInfos
}