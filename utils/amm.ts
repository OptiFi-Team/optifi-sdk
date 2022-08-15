import Context from "../types/context";
import { Connection, GetProgramAccountsFilter, PublicKey, TransactionResponse } from "@solana/web3.js";
import { AmmAccount, UserAccount } from "../types/optifi-exchange-types";
import { findAccountWithSeeds, findExchangeAccount, findOptifiExchange, findUserAccount } from "./accounts";
import { AMM_PREFIX, SOL_DECIMALS, USDC_DECIMALS } from "../constants";
import Position from "../types/position";
import { retrievRecentTxs } from "./orderHistory";
import base58 from "bs58";
import { BN, BorshCoder, BorshEventCoder, eventDiscriminator, EventParser } from "@project-serum/anchor";
import Decimal from "decimal.js";
import { findAssociatedTokenAccount } from "./token";
import { decodeBurnInstruction, getAccount, getMint } from "@solana/spl-token";
import { populateInxAccountKeys } from "./transactions"

export const DELTA_LIMIT = 0.05;
export const WITHDRAW_FEE_PERCENTAGE = 0.001;
export const PERFORMANCE_FEE_PERCENTAGE = 0.1;
// 1 for btc amm, 2 for eth amm
export const ammIndexes = [1, 2]

export function findAMMWithIdx(context: Context,
    exchangeAddress: PublicKey,
    idx: number): Promise<[PublicKey, number]> {
    return findAccountWithSeeds(context, [
        Buffer.from(AMM_PREFIX),
        exchangeAddress.toBuffer(),
        Uint8Array.of(idx)
    ])
}

function iterateFindAMM(context: Context,
    exchangeAddress: PublicKey,
    idx: number = 1
): Promise<[AmmAccount, PublicKey][]> {
    return new Promise((resolve, reject) => {
        let ammAccounts: [AmmAccount, PublicKey][] = [];
        findAMMWithIdx(context,
            exchangeAddress,
            idx).then(([address, bump]) => {
                console.debug("Looking for amm at", address.toString());
                context.program.account.ammAccount.fetch(address).then((res) => {
                    // @ts-ignore
                    ammAccounts.push([res as Amm, address]);
                    iterateFindAMM(context,
                        exchangeAddress,
                        idx + 1).then((remainingRes) => {
                            ammAccounts.push(...remainingRes);
                            resolve(ammAccounts);
                        }).catch((err) => resolve(ammAccounts))
                }).catch((err) => {
                    console.error(err)
                    resolve(ammAccounts)
                })
            }).catch((err) => {
                console.error(err)
                resolve(ammAccounts);
            })
    })
}

export function findAMMAccounts(context: Context): Promise<[AmmAccount, PublicKey][]> {
    return new Promise(async (resolve, reject) => {
        try {
            let [exchangeAddress, _] = await findExchangeAccount(context)
            let filters: GetProgramAccountsFilter[] = [
                {
                    memcmp: {
                        /** offset into program account data to start comparison */
                        offset: 8, // offset of optifi_exchange pubkey in AmmAccount state
                        /** data to match, as base-58 encoded string and limited to less than 129 bytes */
                        bytes: exchangeAddress.toBase58()
                    }
                }
            ]

            let ammAccountInfos = await context.program.account.ammAccount.all(filters)
            // @ts-ignore
            let res: [AmmAccount, PublicKey][] = ammAccountInfos.map(e => [e.account as AmmAccount, e.publicKey])
            // sort by amm idx
            res.sort((a, b) => {
                if (a[0].ammIdx > b[0].ammIdx) return 1;
                if (a[0].ammIdx < b[0].ammIdx) return -1;
                return 0;
            })
            resolve(res)
        } catch (err) {
            reject(err)
        }
    })
}

export function findInstrumentIndexFromAMM(context: Context,
    amm: AmmAccount,
    instrumentAddress: PublicKey): [Position, number] {
    let ammPositions = amm.positions as Position[];
    for (let i = 0; i < ammPositions.length; i++) {
        let position = ammPositions[i];
        if (position.instruments.toString() === instrumentAddress.toString()) {
            return [position, i];
        }
    }
    throw new Error(`Couldn't find instrument address ${instrumentAddress.toString()} in positions ${amm.positions}`);
}

// returns all user's txs on all AMMs
export function getAllUsersTxsOnAllAMM(context: Context): Promise<AmmTx[]> {
    return new Promise(async (resolve, reject) => {
        try {
            let allAmm = await findAMMAccounts(context)
            // console.log("allAmm: ", allAmm)
            let lpTokenMints = allAmm.map(amm => amm[0].lpTokenMint)
            let assets = allAmm.map(amm => amm[0].asset)
            let res = await retrieveAmmTxsForByAccounts(context, lpTokenMints, assets)
            resolve(res)
        } catch (err) {
            reject(err)
        }
    })
}

// returns a user's tx history on all AMMs
export function getUserTxsOnAllAMM(context: Context): Promise<AmmTx[]> {
    return new Promise(async (resolve, reject) => {
        try {
            let allAmm = await findAMMAccounts(context)
            let userLpAccounts: PublicKey[] = []
            let assets: number[] = []
            let [userAccount] = await findUserAccount(context)
            for (let amm of allAmm) {
                let [account, _] = await findAssociatedTokenAccount(context, amm[0].lpTokenMint, userAccount)
                // check if user initialized the account before
                // TODO: how about thoes users who don't use an ATA to interact with on-chain program?
                let accountInfo = await context.connection.getAccountInfo(account)

                if (accountInfo) {
                    userLpAccounts.push(account)
                    assets.push(amm[0].asset)
                }
            }

            let res = await retrieveAmmTxsForByAccounts(context, userLpAccounts, assets)
            resolve(res)

        } catch (err) {
            reject(err)
        }
    })
}

interface UserEquity {
    lpTokenBalance: number, // user's lp token balance
    lpToeknValueInUsdc: number, // user's lp token value in usdc
    earnedValueInUsdc: number, // user's earned value in usdc
}

// return a user's equity on each AMM, based on user's amm tx history
export function getUserEquity(context: Context): Promise<Map<number, UserEquity>> {
    return new Promise(async (resolve, reject) => {
        try {
            let allAmm = await findAMMAccounts(context)
            let userLpAccounts: PublicKey[] = []
            let assets: number[] = []
            let tradedAmmLpMints: PublicKey[] = []
            // let tradedAmmUsdcMints: PublicKey[] = []
            // let tradedAmmUsdcVaults: PublicKey[] = []
            let tradedAmmUsdcLiquidity: number[] = []

            let [userAccount] = await findUserAccount(context)
            for (let amm of allAmm) {
                let [account, _] = await findAssociatedTokenAccount(context, amm[0].lpTokenMint, userAccount)
                // check if user initialized the account before
                // TODO: how about thoes users who don't use an ATA to interact with on-chain program?
                let accountInfo = await context.connection.getAccountInfo(account)
                if (accountInfo) {
                    userLpAccounts.push(account)
                    assets.push(amm[0].asset)
                    tradedAmmLpMints.push(amm[0].lpTokenMint)
                    // tradedAmmUsdcMints.push(amm[0].quoteTokenMint)
                    tradedAmmUsdcLiquidity.push(amm[0].totalLiquidityUsdc.toNumber())
                }
            }

            let equity = new Map<number, UserEquity>()
            let test = new Map<number, string>()

            // get the user's notional usdc balance according to user's tx history (Deposit and Withdraw)
            let allTxs = await retrieveAmmTxsForByAccounts(context, userLpAccounts, assets)
            let notionalBalance = new Map<number, number>()
            allTxs.forEach(tx => {
                if (!notionalBalance.has(tx.asset)) {
                    notionalBalance.set(tx.asset, 0)
                }
                notionalBalance.set(tx.asset, new Decimal(notionalBalance.get(tx.asset)!).add(new Decimal(tx.usdcAmount)).toNumber())
            })

            console.log("notionalBalance: ", notionalBalance)

            // get actual usdc balance according to user lp token balance
            for (let asset of notionalBalance.keys()) {
                let userLpTokenAccountInfo = await getAccount(context.connection, userLpAccounts[assets.indexOf(asset)])
                let userLpTokenBalance = userLpTokenAccountInfo.amount
                let lpTokenMintInfo = await getMint(context.connection, tradedAmmLpMints[assets.indexOf(asset)])
                let lpSupply = lpTokenMintInfo.supply
                // let ammUsdcVaultInfo = await getAccount(context.connection, tradedAmmUsdcVaults[assets.indexOf(asset)])
                let ammUsdcVaultBalance = tradedAmmUsdcLiquidity[assets.indexOf(asset)]
                // let usdcMintInfo = await getMint(context.connection, tradedAmmUsdcMints[assets.indexOf(asset)])

                let actualBalance = new Decimal(userLpTokenBalance.toString())
                    .dividedBy(new Decimal(lpSupply.toString()))
                    .mul(new Decimal(ammUsdcVaultBalance.toString())).div(10 ** USDC_DECIMALS).toNumber()
                // .mul(new Decimal(ammUsdcVaultBalance.toString())).div(10 ** usdcMintInfo.decimals).toNumber()

                equity.set(asset, {
                    lpTokenBalance: new Decimal(userLpTokenBalance.toString()).div(10 ** lpTokenMintInfo.decimals).toNumber(),
                    lpToeknValueInUsdc: actualBalance,
                    earnedValueInUsdc: new Decimal(actualBalance).add(new Decimal(notionalBalance.get(asset)!)).toNumber(),
                })
            }
            resolve(equity)
        } catch (err) {
            reject(err)
        }
    })
}


// return a user's equity on each AMM - based on data in user account.
// it may not be correct because it doesn't take withdraw fees into consideration
export function getUserEquityV2(context: Context): Promise<Map<number, UserEquity>> {
    return new Promise(async (resolve, reject) => {
        try {
            let allAmm = await findAMMAccounts(context)
            let userLpAccounts: PublicKey[] = []
            let assets: number[] = []
            let tradedAmmLpMints: PublicKey[] = []
            // let tradedAmmUsdcMints: PublicKey[] = []
            // let tradedAmmUsdcVaults: PublicKey[] = []
            let tradedAmmUsdcLiquidity: number[] = []
            let [userAccount] = await findUserAccount(context)
            let userAccountInfo = await context.program.account.userAccount.fetch(userAccount)

            for (let amm of allAmm) {
                let [account, _] = await findAssociatedTokenAccount(context, amm[0].lpTokenMint, userAccount)
                // check if user initialized the account before
                // TODO: how about thoes users who don't use an ATA to interact with on-chain program?
                let accountInfo = await context.connection.getAccountInfo(account)
                if (accountInfo) {
                    userLpAccounts.push(account)
                    assets.push(amm[0].asset)
                    tradedAmmLpMints.push(amm[0].lpTokenMint)
                    // tradedAmmUsdcMints.push(amm[0].quoteTokenMint)
                    tradedAmmUsdcLiquidity.push(amm[0].totalLiquidityUsdc.toNumber())
                }
            }

            let equity = new Map<number, UserEquity>()

            // get the user's notional usdc balance
            let notionalBalance = new Map<number, number>()
            for (let amm of allAmm) {
                // @ts-ignore
                let ammEquity = userAccountInfo.ammEquities[amm[0].ammIdx - 1]
                let notioanlWithdrawable = new Decimal(ammEquity.notioanlWithdrawable / 10 ** USDC_DECIMALS)

                // @ts-ignore
                notionalBalance.set(amm[0].ammIdx - 1, notioanlWithdrawable.toNumber())
            }

            // get actual usdc balance according to user lp token balance
            for (let asset of notionalBalance.keys()) {
                if (asset == 2) asset += 1 //for sol condition
                if (userLpAccounts[assets.indexOf(asset)]) {
                    let userLpTokenAccountInfo = await getAccount(context.connection, userLpAccounts[assets.indexOf(asset)])
                    let userLpTokenBalance = userLpTokenAccountInfo.amount
                    let lpTokenMintInfo = await getMint(context.connection, tradedAmmLpMints[assets.indexOf(asset)])
                    let lpSupply = lpTokenMintInfo.supply
                    // let ammUsdcVaultInfo = await getAccount(context.connection, tradedAmmUsdcVaults[assets.indexOf(asset)])
                    let ammUsdcVaultBalance = tradedAmmUsdcLiquidity[assets.indexOf(asset)]
                    // let usdcMintInfo = await getMint(context.connection, tradedAmmUsdcMints[assets.indexOf(asset)])

                    let actualBalance = new Decimal(userLpTokenBalance.toString())
                        .dividedBy(new Decimal(lpSupply.toString()))
                        .mul(new Decimal(ammUsdcVaultBalance.toString())).div(10 ** USDC_DECIMALS).toNumber()
                    // .mul(new Decimal(ammUsdcVaultBalance.toString())).div(10 ** usdcMintInfo.decimals).toNumber()
                    let tmpAsset = (asset == 3) ? asset-1 : asset
                    equity.set(asset, {
                        lpTokenBalance: new Decimal(userLpTokenBalance.toString()).div(10 ** lpTokenMintInfo.decimals).toNumber(),
                        lpToeknValueInUsdc: actualBalance,
                        earnedValueInUsdc: new Decimal(actualBalance).sub(new Decimal(notionalBalance.get(tmpAsset)!)).toNumber(),
                    })
                }
            }
            resolve(equity)
        } catch (err) {
            reject(err)
        }
    })
}

interface AmmEquity {
    ammUsdcVaultBalance: number, // each amm's usdc vault balance
    ammLpTokenSupply: number, // each amm's lp token total supply
    delta: number, // amm's delta based on btc
    delta_percentage: number, // amm's delta based on %
}

export function getAmmEquity(context: Context): Promise<Map<number, AmmEquity>> {
    return new Promise(async (resolve, reject) => {
        try {
            let allAmm = await findAMMAccounts(context)
            let assets: number[] = []
            let tradedAmmLpMints: PublicKey[] = []
            // let tradedAmmUsdcVaults: PublicKey[] = []
            let tradedAmmUsdcLiquidity: number[] = []
            let deltas: number[] = []
            let delta_percentages: number[] = []

            for (let amm of allAmm) {
                assets.push(amm[0].asset)
                tradedAmmLpMints.push(amm[0].lpTokenMint)
                // tradedAmmUsdcVaults.push(amm[0].quoteTokenVault)
                let totalLiquidityUsdc = amm[0].totalLiquidityUsdc.toNumber();
                tradedAmmUsdcLiquidity.push(totalLiquidityUsdc)
                let delta = new Decimal(amm[0].netDelta.toNumber()).div(10 ** USDC_DECIMALS).toNumber();
                deltas.push(delta)
                let delta_percentage = delta * amm[0].price.toNumber() / totalLiquidityUsdc
                delta_percentages.push(delta_percentage)
            }
            let equity = new Map<number, AmmEquity>()

            for (let asset of assets) {
                let lpTokenMintInfo = await getMint(context.connection, tradedAmmLpMints[assets.indexOf(asset)]);
                let lpSupply = lpTokenMintInfo.supply;
                // let ammUsdcVaultInfo = await getAccount(context.connection, tradedAmmUsdcVaults[assets.indexOf(asset)]);
                // let ammUsdcVaultBalance = ammUsdcVaultInfo.amount;
                let ammUsdcVaultBalance = tradedAmmUsdcLiquidity[assets.indexOf(asset)]
                let delta_percentage = delta_percentages[assets.indexOf(asset)]

                // let usdcMintInfo = await getMint(context.connection, ammUsdcVaultInfo.mint);

                equity.set(asset, {
                    ammUsdcVaultBalance: new Decimal(ammUsdcVaultBalance.toString()).div(10 ** USDC_DECIMALS).toNumber(),
                    ammLpTokenSupply: new Decimal(lpSupply.toString()).div(10 ** lpTokenMintInfo.decimals).toNumber(),
                    delta: deltas[assets.indexOf(asset)],
                    delta_percentage: delta_percentage
                })
            }
            resolve(equity)
        } catch (err) {
            reject(err)
        }
    })
}


export function getAmmEquityV2(context: Context, ammAccounts: [AmmAccount, PublicKey][]): Promise<Map<number, AmmEquity>> {
    return new Promise(async (resolve, reject) => {
        try {

            let assets: number[] = []
            let tradedAmmLpMints: PublicKey[] = []
            // let tradedAmmUsdcVaults: PublicKey[] = []
            let tradedAmmUsdcLiquidity: number[] = []

            let deltas: number[] = []
            let delta_percentages: number[] = []

            for (let amm of ammAccounts) {
                assets.push(amm[0].asset)
                tradedAmmLpMints.push(amm[0].lpTokenMint)
                // tradedAmmUsdcVaults.push(amm[0].quoteTokenVault)
                let totalLiquidityUsdc = amm[0].totalLiquidityUsdc.toNumber();
                tradedAmmUsdcLiquidity.push(totalLiquidityUsdc)
                let delta = new Decimal(amm[0].netDelta.toNumber()).div(10 ** USDC_DECIMALS).toNumber();
                deltas.push(delta)
                let delta_percentage = delta * amm[0].price.toNumber() / totalLiquidityUsdc
                delta_percentages.push(delta_percentage)
            }
            let equity = new Map<number, AmmEquity>()

            for (let asset of assets) {
                let lpTokenMintInfo = await getMint(context.connection, tradedAmmLpMints[assets.indexOf(asset)]);
                let lpSupply = lpTokenMintInfo.supply;
                // let ammUsdcVaultInfo = await getAccount(context.connection, tradedAmmUsdcVaults[assets.indexOf(asset)]);
                // let ammUsdcVaultBalance = ammUsdcVaultInfo.amount;
                let ammUsdcVaultBalance = tradedAmmUsdcLiquidity[assets.indexOf(asset)]
                let delta_percentage = delta_percentages[assets.indexOf(asset)]

                // let usdcMintInfo = await getMint(context.connection, ammUsdcVaultInfo.mint);
                equity.set(asset, {
                    ammUsdcVaultBalance: new Decimal(ammUsdcVaultBalance.toString()).div(10 ** USDC_DECIMALS).toNumber(),
                    ammLpTokenSupply: new Decimal(lpSupply.toString()).div(10 ** lpTokenMintInfo.decimals).toNumber(),
                    delta: deltas[assets.indexOf(asset)],
                    delta_percentage: delta_percentage
                })
            }
            resolve(equity)
        } catch (err) {
            reject(err)
        }
    })
}



export class AmmTx {
    type: "Deposit" | "Withdraw"
    asset: number
    usdcAmount: number
    lpAmount: number
    gasFee: number
    platformFee: number | undefined
    txid: string
    timestamp: Date
    status: string
    userWalletAddress: string
    requestId: number
    constructor({
        type,
        asset,
        usdcAmount,
        lpAmount,
        gasFee,
        platformFee,
        txid,
        timestamp,
        status,
        userWalletAddress,
        requestId
    }: {
        type: "Deposit" | "Withdraw"
        asset: number,
        usdcAmount: number,
        lpAmount: number,
        gasFee: number,
        platformFee: number | undefined,
        txid: string,
        timestamp: Date,
        status: string,
        userWalletAddress: string
        requestId: number
    }) {
        this.type = type
        this.asset = asset
        this.usdcAmount = usdcAmount
        this.lpAmount = lpAmount
        this.gasFee = gasFee
        this.platformFee = platformFee
        this.txid = txid
        this.timestamp = timestamp
        this.status = status
        this.userWalletAddress = userWalletAddress
        this.requestId = requestId
    }
}


export function retrieveAmmTxsForByAccounts(context: Context, accounts: PublicKey[], assets: number[]): Promise<AmmTx[]> {
    return new Promise(async (resolve, reject) => {
        try {
            let allTxs = new Map<number, TransactionResponse[]>()

            for (let i = 0; i < accounts.length; i++) {
                let txs = await retrievRecentTxs(context, accounts[i])
                allTxs.set(assets[i], txs)
            }

            // parse the txs
            let parsedTxs = await parseAmmDepositAndWithdrawTx(context, allTxs)

            parsedTxs.sort((a, b) => {
                if (a.timestamp < b.timestamp) return 1;
                if (a.timestamp > b.timestamp) return -1;
                return 0;
            });
            resolve(parsedTxs)
        } catch (err) {
            reject(err)
        }
    })
}

//refer :logAMMAccounts
async function getLpAmount(logs: string[]) {
    let amountStringLen = 14 + 1 + 2 + 1;//"lp_token_amount" + " " + "is" + " "
    let stringRes;
    for (let log of logs) {
        if (log.search("lp_token_amount") != -1) {//Program log: lp_token_amount is 100000000
            stringRes = log.substring(log.search("lp_token_amount") + amountStringLen, log.search("!"))
        }
    }
    // let [optifiExchange, _bump1] = await findOptifiExchange(context)
    // let [ammAddress, _bump2] = await findAMMWithIdx(context, optifiExchange, ammIndex)
    // let amm = await context.program.account.ammAccount.fetch(ammAddress)
    // let tokenMintInfo = await getMint(context.connection, amm.lpTokenMint)
    // let ammWithdrawRequestQueue = await context.program.account.ammWithdrawRequestQueue.fetch(amm.withdrawQueue)
    // // @ts-ignore
    // let ammWithdrawRequestQueueWithAmount = await ammWithdrawRequestQueue.requests.filter(e => e.userAccountId != 0)
    // let decimal = tokenMintInfo.decimals;
    // return ammWithdrawRequestQueueWithAmount[historyId]?.amount?.toNumber() / Math.pow(10, decimal);
    let decimal = 6;
    return parseInt(stringRes) / (10 ** decimal);
}
//refer :logAMMAccounts
async function getRequestId(logs: string[]) {
    // let [optifiExchange, _bump1] = await findOptifiExchange(context)
    // let [ammAddress, _bump2] = await findAMMWithIdx(context, optifiExchange, ammIndex)
    // let amm = await context.program.account.ammAccount.fetch(ammAddress)
    // let ammWithdrawRequestQueue = await context.program.account.ammWithdrawRequestQueue.fetch(amm.withdrawQueue)

    // // @ts-ignore
    // let ammWithdrawRequestQueueWithAmount: any[] = await ammWithdrawRequestQueue.requests.filter(e => e.userAccountId != 0)
    // console.log("ammWithdrawRequestQueueWithAmount: ")
    // for (let e of ammWithdrawRequestQueueWithAmount) {
    //     console.log(e);
    // }
    // return ammWithdrawRequestQueueWithAmount[historyId]?.requestId;
    let requestStringLen = 7 + 1;//"request" + " "
    let stringRes;
    for (let log of logs) {
        if (log.search("request") != -1) {//Program log: Successfully added withdraw request 2 to withdraw queue
            stringRes = log.substring(log.search("request") + requestStringLen, log.search("to"))
        }
    }
    return parseInt(stringRes);
}

//refer :logAMMAccounts
async function getRequestIdAfterConsume(logs: string[]) {
    let requestStringLen = 10 + 1;//"request_id:" + " "
    let stringRes;
    for (let log of logs) {
        //Program log: Successfully processed withdraw request: request_id: 1, user_account_id: 1,
        //burned lp token amount: 100000000, withdraw_usdc_amount: 100000000, total fee: 100000, 
        //final_withdraw_usdc_amount: 99900000'
        if (log.search("request_id") != -1) {
            stringRes = log.substring(log.search("request_id") + requestStringLen, log.search("user_account_id") - 1)
        }
    }
    return parseInt(stringRes);
}
//refer :logAMMAccounts
async function getUsdcAfterConsume(logs: string[]) {
    let usdcStringLen = 20 + 1;//"request_id:" + " "
    let stringRes;
    for (let log of logs) {
        //Program log: Successfully processed withdraw request: request_id: 1, 
        //user_account_id: 1, burned lp token amount: 100000000, withdraw_usdc_amount: 100000000, 
        //total fee: 100000, xr: 99900000',
        if (log.search("withdraw_usdc_amount") != -1) {
            stringRes = log.substring(log.search("withdraw_usdc_amount") + usdcStringLen, log.search("total") - 1)
        }
    }
    return parseInt(stringRes) / (10 ** USDC_DECIMALS);
}

//refer :logAMMAccounts
async function getWtihdrawFeeAfterConsume(logs: string[]) {
    let fee = 0;
    for (let log of logs) {
        if (log.includes("Successfully processed withdraw request")) {
            let details = getConsumeWithdrawDetailsFromLog(log)
            fee = details.totalFee
        }

    }

    return fee / (10 ** USDC_DECIMALS)
}

function getConsumeWithdrawDetailsFromLog(programLog: string) {
    // Program log: Created new order instruction, side: Ask, price: 5227813, size: 2, value: 10455626, order_type: Limit, client_order_id: 4475
    let items = programLog.split(",")
    let temp = {}
    items.forEach((item, i) => {
        if (i > 0) {
            let key = item.split(":")[0].trim()
            let value = item.split(":")[1].trim()
            temp[key] = value
        }
    })
    // console.log(
    //     {
    //         userAccountId: parseInt(temp["user_account_id"]),
    //         burnedLpTokenAmount: parseInt(temp["burned lp token amount"]),
    //         withdrawUsdcAmount: parseInt(temp["withdraw_usdc_amount"]),
    //         totalFee: parseInt(temp["total fee"]),
    //         finalWithdrawUsdcAmount: parseInt(temp["final_withdraw_usdc_amount"]),
    //     }
    //     // temp
    // )
    return {
        userAccountId: parseInt(temp["user_account_id"]),
        burnedLpTokenAmount: parseInt(temp["burned lp token amount"]),
        withdrawUsdcAmount: parseInt(temp["withdraw_usdc_amount"]),
        totalFee: parseInt(temp["total fee"]),
        finalWithdrawUsdcAmount: parseInt(temp["final_withdraw_usdc_amount"]),
    }
}


//refer :logAMMAccounts
async function getLpAmountAfterConsume(logs: string[]) {
    let requestStringLen = 22 + 1;//"request_id:" + " "
    let stringRes;
    for (let log of logs) {
        //Program log: Successfully processed withdraw request: request_id: 1, user_account_id: 1,
        //burned lp token amount: 100000000, withdraw_usdc_amount: 100000000, total fee: 100000, 
        //final_withdraw_usdc_amount: 99900000'
        if (log.search("burned lp token amount") != -1) {
            stringRes = log.substring(log.search("burned lp token amount") + requestStringLen, log.search("withdraw_usdc_amount") - 1)
        }
    }
    let decimal = 6;
    return parseInt(stringRes) / (10 ** decimal);
}

//refer:logAMMAccounts
async function getUserWalletAddress(logs: string[]) {
    let ownerStringLen = 9
    let stringRes: string;
    for (let log of logs) {
        //Program log: owner is BoMyXkJdsuoB9VepzeMHYB1SgNJPCQDnzDjvUqAo328X!
        if (log.search("owner") != -1) {
            stringRes = log.substring(log.search("owner") + ownerStringLen, log.search("!"))
        }
    }
    //@ts-ignore
    return stringRes
}

export function parseAmmDepositAndWithdrawTx(context: Context, txsMap: Map<number, TransactionResponse[]>): Promise<AmmTx[]> {
    return new Promise(async (resolve, reject) => {
        try {
            let res: AmmTx[] = []
            let requestIdArray: number[] = [];
            let lpAmountConsumed: number[] = new Array(5000);
            for (let i = 0; i < lpAmountConsumed.length; i++) {
                lpAmountConsumed[i] = 0;
            }

            for (const [asset, txs] of txsMap) {
                for (let tx of txs) {//number of transactions people send

                    for (let inx of tx.transaction.message.instructions) {
                        let programId = tx.transaction.message.accountKeys[inx.programIdIndex];
                        if (programId.toString() == context.program.programId.toString()) {
                            let programAccounts = populateInxAccountKeys(context, tx.transaction.message.accountKeys, inx)
                            let coder = context.program.coder as BorshCoder;
                            let decoded = coder.instruction.decode(base58.decode(inx.data))

                            if (decoded) {
                                if (decoded.name == "ammDeposit") {
                                    // let userUsdcAccountIndex = inx.accounts[3]
                                    //@ts-ignore
                                    let userUsdcAccountIndex = programAccounts.userQuoteTokenVault.accountIndex
                                    // let userLpAccountIndex = inx.accounts[6]
                                    //@ts-ignore
                                    let userLpAccountIndex = programAccounts.userLpTokenVault.accountIndex

                                    let preTokenAccount = tx.meta?.preTokenBalances?.find(e => e.accountIndex == userUsdcAccountIndex)!
                                    let postTokenAccount = tx.meta?.postTokenBalances?.find(e => e.accountIndex == userUsdcAccountIndex)!

                                    let usdcAmount = new Decimal(postTokenAccount.uiTokenAmount.uiAmountString!).minus(
                                        new Decimal(preTokenAccount.uiTokenAmount.uiAmountString!)).toNumber()
                                    let preTokenAccount2 = tx.meta?.preTokenBalances?.find(e => e.accountIndex == userLpAccountIndex)!
                                    let postTokenAccount2 = tx.meta?.postTokenBalances?.find(e => e.accountIndex == userLpAccountIndex)!

                                    let lpAmount = preTokenAccount2 ? new Decimal(postTokenAccount2.uiTokenAmount.uiAmountString!).minus(
                                        new Decimal(preTokenAccount2.uiTokenAmount.uiAmountString!)).toNumber()
                                        : new Decimal(postTokenAccount2.uiTokenAmount.uiAmountString!).toNumber()

                                    res.push(new AmmTx({
                                        type: "Deposit",
                                        asset: asset,
                                        usdcAmount,
                                        lpAmount,
                                        gasFee: tx.meta?.fee! / Math.pow(10, SOL_DECIMALS),
                                        txid: tx.transaction.signatures[0],
                                        timestamp: new Date(tx.blockTime! * 1000),
                                        status: "Completed",
                                        // @ts-ignore
                                        userWalletAddress: postTokenAccount2.owner,
                                        requestId: -1,
                                    }))
                                } else if (decoded.name == "ammWithdraw") {


                                    // let userUsdcAccountIndex = inx.accounts[4]//user_quote_token_vault
                                    //@ts-ignore
                                    let userUsdcAccountIndex = programAccounts.userQuoteTokenVault.accountIndex
                                    // console.log("userUsdcAccountIndex:", userUsdcAccountIndex)
                                    // let userLpAccountIndex = inx.accounts[7]//user_lp_token_vault
                                    //@ts-ignore
                                    let userLpAccountIndex = programAccounts.userLpTokenVault.accountIndex
                                    // console.log("userLpAccountIndex:", userLpAccountIndex)

                                    let preTokenAccount = tx.meta?.preTokenBalances?.find(e => e.accountIndex == userUsdcAccountIndex)
                                    let postTokenAccount = tx.meta?.postTokenBalances?.find(e => e.accountIndex == userUsdcAccountIndex)!

                                    // Decimal lib handles float precision
                                    let usdcAmount = preTokenAccount ? new Decimal(postTokenAccount.uiTokenAmount.uiAmountString!).minus(
                                        new Decimal(preTokenAccount.uiTokenAmount.uiAmountString!)).toNumber()
                                        : new Decimal(postTokenAccount.uiTokenAmount.uiAmountString!).toNumber()

                                    let preTokenAccount2 = tx.meta?.preTokenBalances?.find(e => e.accountIndex == userLpAccountIndex)!
                                    let postTokenAccount2 = tx.meta?.postTokenBalances?.find(e => e.accountIndex == userLpAccountIndex)!

                                    // console.log("preTokenAccount2: ", preTokenAccount2)
                                    // console.log("postTokenAccount2: ", postTokenAccount2)

                                    let lpAmount = preTokenAccount2 ? new Decimal(postTokenAccount2.uiTokenAmount.uiAmountString!).minus(
                                        new Decimal(preTokenAccount2.uiTokenAmount.uiAmountString!)).toNumber()
                                        : new Decimal(postTokenAccount2.uiTokenAmount.uiAmountString!).toNumber()

                                    res.push(new AmmTx({
                                        type: "Withdraw",
                                        asset: asset,
                                        usdcAmount,
                                        lpAmount,
                                        gasFee: tx.meta?.fee! / Math.pow(10, SOL_DECIMALS),
                                        txid: tx.transaction.signatures[0],
                                        timestamp: new Date(tx.blockTime! * 1000),
                                        status: "Completed",
                                        // @ts-ignore
                                        userWalletAddress: postTokenAccount2.owner
                                    }))
                                } else if (decoded.name == "addWithdrawRequest") {
                                    // console.log(tx.meta?.logMessages)
                                    /* 
                                    there is no preTokenBalances and postTokenBalances here, 
                                    means that can't get usdc amount / lpAmount / userWalletAddress here 
                                    */

                                    let usdcAmount = 0;
                                    //@ts-ignore
                                    let lpAmount = await getLpAmount(tx.meta?.logMessages);
                                    //@ts-ignore
                                    let requestId = await getRequestId(tx.meta?.logMessages);
                                    //@ts-ignore
                                    let userWalletAddress = await getUserWalletAddress(tx.meta?.logMessages)
                                    // console.log(tx.meta?.logMessages)
                                    requestIdArray.push(requestId);
                                    res.push(new AmmTx({
                                        type: "Withdraw",
                                        asset: asset,
                                        usdcAmount,
                                        lpAmount,
                                        gasFee: tx.meta?.fee! / Math.pow(10, SOL_DECIMALS),
                                        platformFee: 0,
                                        txid: tx.transaction.signatures[0],
                                        timestamp: new Date(tx.blockTime! * 1000),
                                        status: "Pending",
                                        // @ts-ignore
                                        userWalletAddress: userWalletAddress, //from program inx.accounts[4], but there is nothing in meta
                                        requestId: requestId
                                    }))

                                }
                            } else console.log("can't decode")
                        }
                    }
                }

                for (let tx of txs) {//number of transactions people send
                    for (let inx of tx.transaction.message.instructions) {
                        let programId = tx.transaction.message.accountKeys[inx.programIdIndex];
                        if (programId.toString() == context.program.programId.toString()) {
                            let coder = context.program.coder as BorshCoder;
                            let decoded = coder.instruction.decode(base58.decode(inx.data))

                            if (decoded) {
                                if (decoded.name == "consumeWithdrawQueue") {
                                    //@ts-ignore
                                    let requestId = await getRequestIdAfterConsume(tx.meta?.logMessages)
                                    for (let e of res) {
                                        if (e.requestId == requestId) {

                                            //@ts-ignore
                                            let usdcAmount = await getUsdcAfterConsume(tx.meta?.logMessages)
                                            let feeAmount = await getWtihdrawFeeAfterConsume(tx.meta?.logMessages!)
                                            //@ts-ignore
                                            let userBurnLpAmountAfterConsume = await getLpAmountAfterConsume(tx.meta?.logMessages)

                                            e.platformFee = e.platformFee ? e.platformFee + feeAmount : feeAmount;
                                            e.usdcAmount += usdcAmount;
                                            let percentage = 0;

                                            // finish consume
                                            if (userBurnLpAmountAfterConsume == e.lpAmount) {
                                                e.status = "Completed"
                                            } else {
                                                lpAmountConsumed[requestId] += userBurnLpAmountAfterConsume;
                                                percentage = Math.ceil(lpAmountConsumed[requestId] * 100 / e.lpAmount)
                                                e.status = "Processing(" + percentage.toString() + "%)"
                                            }


                                        }
                                    }
                                }
                            } else console.log("can't decode")
                        }
                    }
                }
            }
            resolve(res)
        }
        catch (err) {
            reject(err)
        }
    })
}


// get the maximum withdrawable usdc amount of an AMM
export function getAmmWithdrawCapacity(amm: AmmAccount, spotPrice: number): number {
    let maxWithdrawable = amm.totalLiquidityUsdc.toNumber() / (10 ** USDC_DECIMALS) - (Math.abs(amm.netDelta.toNumber()) / (10 ** USDC_DECIMALS)) * spotPrice / DELTA_LIMIT
    if (maxWithdrawable < 0) {
        maxWithdrawable = 0;
    }
    return maxWithdrawable
}

// convert given amount of lp tokens to usdc amount - decimals not considered
export function lpToUsdcAmount(
    lpTokenAmount: number,
    lpTokenSupply: number,
    totalLiquidityUsdc: number,
): number {
    let rawAmount =
        totalLiquidityUsdc * (lpTokenAmount / lpTokenSupply);
    let amount = (rawAmount - rawAmount % 1);
    return amount
}

// calculate amm withdraw fees - decimals considered
export async function calcAmmWithdrawFees(
    connection: Connection,
    amm: AmmAccount,
    userAccount: UserAccount,
    lpAmountToWithdraw: number
): Promise<[withdrawAmountInUSDC: number, withdrawFee: number, performanceFee: number]> {
    return new Promise(async (resolve, reject) => {
        try {
            // get amm lp token mint supply - note that no need to consider decimals of lp token, just use raw amount for calculation
            let lpMint = await getMint(connection, amm.lpTokenMint)
            let lpTokenSupply = new BN(lpMint.supply.toString()).toNumber();

            //@ts-ignore
            let notioanlWithdrawableRaw = userAccount.ammEquities[amm.ammIdx - 1].notioanlWithdrawable;
            let notioanlWithdrawable = notioanlWithdrawableRaw / (10 ** USDC_DECIMALS)

            // console.log("notioanlWithdrawable: ", notioanlWithdrawable)
            // console.log("lpAmountToWithdraw: ", lpAmountToWithdraw)

            // withdraw amount in usdc
            let withdrawAmountRaw = lpToUsdcAmount(lpAmountToWithdraw * 10 ** lpMint.decimals, lpTokenSupply, amm.totalLiquidityUsdc.toNumber())
            let withdrawAmount = withdrawAmountRaw / (10 ** USDC_DECIMALS)
            // console.log("withdrawAmount: ", withdrawAmount)

            // calc withdraw fee: 0.1%
            let withdrawFee = withdrawAmount * WITHDRAW_FEE_PERCENTAGE;
            // console.log("withdraw fee: ", withdrawFee);

            let profit: number = 0;
            let performanceFee: number = 0;

            // calc performance fee: 10%
            if (withdrawAmount > notioanlWithdrawable) {
                console.log("calculating performance fee");

                // clac user's profit
                profit = withdrawAmount - notioanlWithdrawable;

                // calc performance fee
                performanceFee = profit * PERFORMANCE_FEE_PERCENTAGE;
            }

            let totalFee = withdrawFee + performanceFee;

            //     // round up to integer
            //     let fee = if fee_f % 1f64 == 0f64 {
            //         fee_f as u64
            //     } else {
            //         (fee_f - (fee_f % 1f64) + 1f64) as u64
            //     };
            //     return fee;

            console.log(`withdraw amount in usdc: ${withdrawAmount}, withdraw fee: ${withdrawFee}, total profit: ${profit}, performance fee: ${performanceFee}, total fee: ${totalFee}`);

            resolve([withdrawAmount, withdrawFee, performanceFee])

        } catch (err) {
            reject(err)
        }
    })
}

export async function getAmmWithdrawQueue(context: Context, withdrawQueue: PublicKey) {
    let queueRaw = await context.connection.getAccountInfo(withdrawQueue)
    // console.log("queueRaw?.data: ", queueRaw?.data)

    // console.log("queueRaw?.data.length: ", queueRaw?.data.length)

    // console.log("queueRaw?.data.length: ", queueRaw?.data.slice(17, 21))

    let size = context.program.account.ammWithdrawRequestQueue.size
    // console.log("size : ", size)

    let trimmedBytes = Buffer.concat([queueRaw?.data.slice(0, 20)!, queueRaw?.data.slice(24, queueRaw?.data.length - 4)!]);
    // console.log("trimmedBytes: ", trimmedBytes)
    // console.log("trimmedBytes.length: ", trimmedBytes.length)


    let ammWithdrawRequestQueue = context.program.account.ammAccount.coder.accounts.decode("AmmWithdrawRequestQueue", trimmedBytes)
    // console.log("decoded ammWithdrawRequestQueue: ", ammWithdrawRequestQueue)
    return ammWithdrawRequestQueue
}
