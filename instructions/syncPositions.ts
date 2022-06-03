import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import { PublicKey, Transaction, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, getDexOpenOrders } from "../utils/accounts";
import { AmmAccount, OptifiMarket } from "../types/optifi-exchange-types";
import { SERUM_DEX_PROGRAM_ID } from "../constants";
import { findInstrumentIndexFromAMM } from "../utils/amm";
import { findAssociatedTokenAccount } from "../utils/token";
import { signAndSendTransaction, TransactionResultType } from "../utils/transactions";
import { getAmmLiquidityAuthPDA } from "../utils/pda";

export default function syncPositions(context: Context,
    marketAddress: PublicKey,
    ammAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.optifiMarket.fetch(marketAddress)
                .then((marketRes) => {
                    let optifiMarket = marketRes as OptifiMarket;
                    context.program.account.ammAccount.fetch(ammAddress).then(async (ammRes) => {
                        try {
                            // @ts-ignore
                            let amm = ammRes as AmmAccount;
                            let [ammLiquidityAuth,] = await getAmmLiquidityAuthPDA(context);
                            let [ammLongTokenVault,] = await findAssociatedTokenAccount(context, optifiMarket.instrumentLongSplToken, ammLiquidityAuth)
                            let [ammShortTokenVault,] = await findAssociatedTokenAccount(context, optifiMarket.instrumentShortSplToken, ammLiquidityAuth)
                            let [ammOpenOrders,] = await getDexOpenOrders(
                                context,
                                optifiMarket.serumMarket,
                                ammLiquidityAuth)

                            let [position, instrumentIdx] = findInstrumentIndexFromAMM(context,
                                amm,
                                optifiMarket.instrument
                            );
                            context.program.rpc.ammSyncPositions(
                                instrumentIdx,
                                {
                                    accounts: {
                                        optifiExchange: exchangeAddress,
                                        amm: ammAddress,
                                        optifiMarket: marketAddress,
                                        longTokenVault: ammLongTokenVault,
                                        shortTokenVault: ammShortTokenVault,
                                        serumMarket: optifiMarket.serumMarket,
                                        openOrdersAccount: ammOpenOrders,
                                        openOrdersOwner: ammLiquidityAuth
                                    }
                                }
                            ).then((syncRes) => {
                                resolve({
                                    successful: true,
                                    data: syncRes as TransactionSignature
                                })
                            }).catch((err) => {
                                console.error(err);
                                reject(err);
                            })
                        } catch (err) {
                            reject(err)
                        }
                    }).catch((err) => reject(err))
                    // }).catch((err) => reject(err))
                    // }).catch((err) => reject(err))
                    // }).catch((err) => reject(err))
                    // })
                    // .catch((err) => reject(err))
                }).catch((err) => reject(err))
        })
    })
}


export function syncPositionsInBatch(context: Context,
    exchangeAddress: PublicKey,
    ammAddress: PublicKey,
    ammAccount: AmmAccount,
    optifiMarketInfos: [OptifiMarket, PublicKey][],
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        try {
            let tx = new Transaction()
            optifiMarketInfos.forEach(async optifiMarketInfo => {

                let optifiMarket = optifiMarketInfo[0]
                let amm = ammAccount;
                let [ammLiquidityAuth,] = await getAmmLiquidityAuthPDA(context);
                let [ammLongTokenVault,] = await findAssociatedTokenAccount(context, optifiMarket.instrumentLongSplToken, ammLiquidityAuth)
                let [ammShortTokenVault,] = await findAssociatedTokenAccount(context, optifiMarket.instrumentShortSplToken, ammLiquidityAuth)
                let [ammOpenOrders,] = await getDexOpenOrders(
                    context,
                    optifiMarket.serumMarket,
                    ammLiquidityAuth)

                let [_, instrumentIdx] = findInstrumentIndexFromAMM(context,
                    amm,
                    optifiMarket.instrument
                );
                let inx = context.program.instruction.ammSyncPositions(
                    instrumentIdx,
                    {
                        accounts: {
                            optifiExchange: exchangeAddress,
                            amm: ammAddress,
                            optifiMarket: optifiMarketInfo[1],
                            longTokenVault: ammLongTokenVault,
                            shortTokenVault: ammShortTokenVault,
                            serumMarket: optifiMarket.serumMarket,
                            openOrdersAccount: ammOpenOrders,
                            openOrdersOwner: ammLiquidityAuth
                        }
                    }
                )

                tx.add(inx)
            })

            let syncRes = await context.provider.send(tx);
            resolve({
                successful: true,
                data: syncRes as TransactionSignature
            })
        } catch (err) {
            reject(err)
        }
    })
}