
import Decimal from "decimal.js";
import path from "path";
import { initializeContext } from "../../index";
import { findExchangeAccount } from "../../utils/accounts";
import { findAllTokenAccountsByMint, getTokenMintFromAccountInfo } from "../../utils/token";
import fs from "fs";

initializeContext().then(async (context) => {

    let lpPrices = [1.0027580335304787, 1.122844856859746]
    let [exchangeAddress,] = await findExchangeAccount(context)
    const filters = [
        {
            memcmp: {
                offset: 8,
                bytes: exchangeAddress.toBase58(),
            },
        },
    ]
    let allAmms = await context.program.account.ammAccount.all(filters)
    let lpTokenMintAddresses = allAmms.map(e => e.account.lpTokenMint)
    let ammIdxes = allAmms.map(e => e.account.ammIdx)

    let tokenMintsInfo = await context.connection.getMultipleAccountsInfo(lpTokenMintAddresses)

    // console.log("lpTokenMintAddresses: ", lpTokenMintAddresses.map(e => e.toString()))

    let depositors: Depositor[] = []

    for (let i = 0; i < lpTokenMintAddresses.length; i++) {
        let lpMint = lpTokenMintAddresses[i]
        let tokenMint = await getTokenMintFromAccountInfo(tokenMintsInfo[i]!, lpMint)
        let decimals = tokenMint.decimals
        let tokenAccounts = await findAllTokenAccountsByMint(context.connection, lpMint)

        console.log("tokenAccounts.length: ", tokenAccounts.length)
        for (let tokenAccount of tokenAccounts) {
            let userAccount = tokenAccount.owner
            let userBalanceUi = new Decimal(tokenAccount.amount.toString()).div(10 ** decimals).toNumber()

            let [_, depositor] = findDepositor(userAccount.toString(), depositors)
            if (depositor) {
                depositor.lpTokenBalances.push({
                    ammIdx: ammIdxes[i],
                    lpMint: lpMint.toString(),
                    uiBalance: userBalanceUi
                })
                depositor.totalValueInUsdc += userBalanceUi * lpPrices[i]
            } else {
                let userAccountInfo = await context.program.account.userAccount.fetch(userAccount)
                let depositor = {
                    userAccount: userAccount.toString(),
                    ownerAddress: userAccountInfo.owner.toString(),
                    totalValueInUsdc: userBalanceUi * lpPrices[i],
                    lpTokenBalances: [{ ammIdx: ammIdxes[i], lpMint: lpMint.toString(), uiBalance: userBalanceUi }]
                }
                depositors.push(depositor)
            }
        }
    }


    depositors.sort((a, b) => {
        if (a.totalValueInUsdc > b.totalValueInUsdc) return -1;
        if (a.totalValueInUsdc < b.totalValueInUsdc) return 1;
        return 0;
    })

    console.log("depositors: ", depositors.length)
    console.log("depositors[0]: ", depositors[0])

    saveJsonFile(depositors)
})

export interface Depositor {
    userAccount: string,
    ownerAddress: string,
    totalValueInUsdc: number,
    lpTokenBalances: { ammIdx: number, lpMint: string, uiBalance: number }[]
}
function findDepositor(userAccount: string, depositors: Depositor[]): [number, Depositor | null] {
    for (let i = 0; i < depositors.length; i++) {
        let depositor = depositors[i]
        if (depositor.userAccount == userAccount) {
            return [i, depositor]
        }
    }
    return [-1, null]
}

export function saveJsonFile(data: Depositor[]) {
    let dateTime = new Date();
    let filename = path.resolve(__dirname,"amm-depositors-" + dateTime.toISOString() + ".json");
    fs.writeFileSync(filename, JSON.stringify(data, null, 4));
}