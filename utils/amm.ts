import Context from "../types/context";
import { GetProgramAccountsFilter, PublicKey, TransactionResponse } from "@solana/web3.js";
import { AmmAccount } from "../types/optifi-exchange-types";
import { findAccountWithSeeds, findExchangeAccount } from "./accounts";
import { AMM_PREFIX, SOL_DECIMALS } from "../constants";
import Position from "../types/position";
import { retrievRecentTxs } from "./orderHistory";
import { decodeIdlAccount } from "@project-serum/anchor/dist/cjs/idl";
import ts from "typescript";
import { connection } from "@project-serum/common";
import ammWithdraw from "../instructions/ammWithdraw";
import { rejects } from "assert";
import base58, { decode } from "bs58";
import { BN } from "@project-serum/anchor";
import Decimal from "decimal.js";
import { findAssociatedTokenAccount } from "./token";
import { getAccount, getMint } from "@solana/spl-token";

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
        // findExchangeAccount(context).then(([exchangeAddress, _]) => {
        // iterateFindAMM(context, exchangeAddress).then((accts) => {
        //     console.debug(`Found ${accts.length} AMM accounts`);
        //     resolve(accts);
        // })
        // })
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
            for (let amm of allAmm) {
                let [account, _] = await findAssociatedTokenAccount(context, amm[0].lpTokenMint)
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

// return a user's equity on each AMM
export function getUserEquity(context: Context): Promise<Map<number, UserEquity>> {
    return new Promise(async (resolve, reject) => {
        try {
            let allAmm = await findAMMAccounts(context)
            let userLpAccounts: PublicKey[] = []
            let assets: number[] = []
            let tradedAmmLpMints: PublicKey[] = []
            let tradedAmmUsdcVaults: PublicKey[] = []

            for (let amm of allAmm) {
                let [account, _] = await findAssociatedTokenAccount(context, amm[0].lpTokenMint)
                // check if user initialized the account before
                // TODO: how about thoes users who don't use an ATA to interact with on-chain program?
                let accountInfo = await context.connection.getAccountInfo(account)
                if (accountInfo) {
                    userLpAccounts.push(account)
                    assets.push(amm[0].asset)
                    tradedAmmLpMints.push(amm[0].lpTokenMint)
                    tradedAmmUsdcVaults.push(amm[0].quoteTokenVault)
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
                let ammUsdcVaultInfo = await getAccount(context.connection, tradedAmmUsdcVaults[assets.indexOf(asset)])
                let ammUsdcVaultBalance = ammUsdcVaultInfo.amount
                let usdcMintInfo = await getMint(context.connection, ammUsdcVaultInfo.mint)

                let actualBalance = new Decimal(userLpTokenBalance.toString())
                    .dividedBy(new Decimal(lpSupply.toString()))
                    .mul(new Decimal(ammUsdcVaultBalance.toString())).div(10 ** usdcMintInfo.decimals).toNumber()
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
interface AmmEquity {
    ammUsdcVaultBalance: number, // each amm's usdc vault balance
    ammLpTokenSupply: number // each amm's lp token total supply
}

export function getAmmEquity(context: Context): Promise<Map<number, AmmEquity>> {
    return new Promise(async (resolve, reject) => {
        try {
            let allAmm = await findAMMAccounts(context)
            let assets: number[] = []
            let tradedAmmLpMints: PublicKey[] = []
            let tradedAmmUsdcVaults: PublicKey[] = []

            for (let amm of allAmm) {
                assets.push(amm[0].asset)
                tradedAmmLpMints.push(amm[0].lpTokenMint)
                tradedAmmUsdcVaults.push(amm[0].quoteTokenVault)
            }
            let equity = new Map<number, AmmEquity>()

            for (let asset of assets) {
                let lpTokenMintInfo = await getMint(context.connection, tradedAmmLpMints[assets.indexOf(asset)]);
                let lpSupply = lpTokenMintInfo.supply;
                let ammUsdcVaultInfo = await getAccount(context.connection, tradedAmmUsdcVaults[assets.indexOf(asset)]);
                let ammUsdcVaultBalance = ammUsdcVaultInfo.amount;
                let usdcMintInfo = await getMint(context.connection, ammUsdcVaultInfo.mint);

                equity.set(asset, {
                    ammUsdcVaultBalance: new Decimal(ammUsdcVaultBalance.toString()).div(10 ** usdcMintInfo.decimals).toNumber(),
                    ammLpTokenSupply: new Decimal(lpSupply.toString()).div(10 ** lpTokenMintInfo.decimals).toNumber(),
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
    txid: string
    timestamp: Date
    status: string
    userWalletAddress: string
    constructor({
        type,
        asset,
        usdcAmount,
        lpAmount,
        gasFee,
        txid,
        timestamp,
        status,
        userWalletAddress
    }: {
        type: "Deposit" | "Withdraw"
        asset: number,
        usdcAmount: number,
        lpAmount: number,
        gasFee: number,
        txid: string,
        timestamp: Date,
        status: string,
        userWalletAddress: string
    }) {
        this.type = type
        this.asset = asset
        this.usdcAmount = usdcAmount
        this.lpAmount = lpAmount
        this.gasFee = gasFee
        this.txid = txid
        this.timestamp = timestamp
        this.status = status
        this.userWalletAddress = userWalletAddress
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
            let parsedTxs = parseAmmDepositAndWithdrawTx(context, allTxs)

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

export function parseAmmDepositAndWithdrawTx(context: Context, txsMap: Map<number, TransactionResponse[]>): AmmTx[] {
    let res: AmmTx[] = []
    txsMap.forEach((txs, asset) => {
        for (let tx of txs) {
            // tx.transaction.message.instructions
            // tx.meta?.innerInstructions[0].instructions
            // console.log("txid: ", tx.transaction.signatures[0].toString())
            // console.log("tx.transaction.message.instructions: ", tx.transaction.message.instructions)
            // console.log("tx.meta?.innerInstructions", tx.meta?.innerInstructions?.[0].instructions)
            tx.transaction.message.instructions.forEach(inx => {
                let programId =
                    tx.transaction.message.accountKeys[inx.programIdIndex];
                if (programId.toString() == context.program.programId.toString()) {
                    // console.log("inx.data: ", inx.data)
                    let decoded = context.program.coder.instruction.decode(base58.decode(inx.data))

                    if (decoded) {
                        if (decoded.name == "ammDeposit") {
                            let userUsdcAccountIndex = inx.accounts[4]
                            // console.log("userUsdcAccountIndex:", userUsdcAccountIndex)
                            let userLpAccountIndex = inx.accounts[7]
                            // console.log("userLpAccountIndex:", userLpAccountIndex)

                            let preTokenAccount = tx.meta?.preTokenBalances?.find(e => e.accountIndex == userUsdcAccountIndex)!
                            let postTokenAccount = tx.meta?.postTokenBalances?.find(e => e.accountIndex == userUsdcAccountIndex)!

                            let usdcAmount = new Decimal(postTokenAccount.uiTokenAmount.uiAmount!).minus(
                                new Decimal(preTokenAccount.uiTokenAmount.uiAmount!)).toNumber()
                            let preTokenAccount2 = tx.meta?.preTokenBalances?.find(e => e.accountIndex == userLpAccountIndex)!
                            let postTokenAccount2 = tx.meta?.postTokenBalances?.find(e => e.accountIndex == userLpAccountIndex)!

                            let lpAmount = preTokenAccount2 ? new Decimal(postTokenAccount2.uiTokenAmount.uiAmount!).minus(
                                new Decimal(preTokenAccount2.uiTokenAmount.uiAmount!)).toNumber()
                                : postTokenAccount2.uiTokenAmount.uiAmount!

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
                                userWalletAddress: postTokenAccount2.owner
                            }))
                        } else if (decoded.name == "ammWithdraw") {


                            let userUsdcAccountIndex = inx.accounts[4]
                            // console.log("userUsdcAccountIndex:", userUsdcAccountIndex)
                            let userLpAccountIndex = inx.accounts[7]
                            // console.log("userLpAccountIndex:", userLpAccountIndex)

                            let preTokenAccount = tx.meta?.preTokenBalances?.find(e => e.accountIndex == userUsdcAccountIndex)
                            let postTokenAccount = tx.meta?.postTokenBalances?.find(e => e.accountIndex == userUsdcAccountIndex)!

                            // Decimal lib handles float precision
                            let usdcAmount = preTokenAccount ? new Decimal(postTokenAccount.uiTokenAmount.uiAmount!).minus(
                                new Decimal(preTokenAccount.uiTokenAmount.uiAmount!)).toNumber()
                                : postTokenAccount.uiTokenAmount.uiAmount!

                            let preTokenAccount2 = tx.meta?.preTokenBalances?.find(e => e.accountIndex == userLpAccountIndex)!
                            let postTokenAccount2 = tx.meta?.postTokenBalances?.find(e => e.accountIndex == userLpAccountIndex)!

                            // console.log("preTokenAccount2: ", preTokenAccount2)
                            // console.log("postTokenAccount2: ", postTokenAccount2)

                            let lpAmount = preTokenAccount2 ? new Decimal(postTokenAccount2.uiTokenAmount.uiAmount!).minus(
                                new Decimal(preTokenAccount2.uiTokenAmount.uiAmount!)).toNumber()
                                : postTokenAccount2.uiTokenAmount.uiAmount!

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
                        }
                    }
                }
            })
        }
    })
    return res
}