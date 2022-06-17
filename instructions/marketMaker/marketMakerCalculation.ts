import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, SYSVAR_RENT_PUBKEY, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findMarketMakerAccount, findUserAccount, getDexOpenOrders } from "../../utils/accounts";
import { findAssociatedTokenAccount } from "../../utils/token";
import { SERUM_DEX_PROGRAM_ID, USDC_DECIMALS, USDC_TOKEN_MINT } from "../../constants";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";
import { getSerumMarket } from "../../utils/serum";
import { Chain, OptifiMarket, OrderSide } from "../../types/optifi-exchange-types";
import { findMarginStressWithAsset } from "../../utils/margin";
import { findOptifiUSDCPoolAuthPDA } from "../../utils/pda";
import { increaseComputeUnitsIx } from "../../utils/transactions";

export default function marketMakerCalculation(
    context: Context,
    marketAddress: PublicKey,
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.exchange.fetch(exchangeAddress).then(exchangeInfo => {
                findUserAccount(context).then(([userAccountAddress, _]) => {
                    context.program.account.userAccount.fetch(userAccountAddress).then((userAcctRaw) => {
                        findMarketMakerAccount(context).then(([marketMakerAccount]) => {
                            findAssociatedTokenAccount(context,
                                new PublicKey(USDC_TOKEN_MINT[context.endpoint]),
                                userAccountAddress).then(([userMargin,]) => {
                                    let serumProgramId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint])
                                    context.program.account.optifiMarket.fetch(marketAddress).then((marketRes) => {
                                        let optifiMarket = marketRes as OptifiMarket;
                                        getSerumMarket(context, optifiMarket.serumMarket).then((serumMarket) => {
                                            getDexOpenOrders(context, optifiMarket.serumMarket, userAccountAddress).then(([userOpenOrdersAccount, _]) => {
                                                findAssociatedTokenAccount(context, optifiMarket.instrumentLongSplToken, userAccountAddress).then(([userLongTokenVault, _]) => {
                                                    findAssociatedTokenAccount(context, optifiMarket.instrumentShortSplToken, userAccountAddress).then(([userShortTokenVault, _]) => {
                                                        context.program.account.chain
                                                            .fetch(marketRes.instrument).then(chainRes => {
                                                                // @ts-ignore
                                                                let chain = chainRes as Chain;
                                                                findMarginStressWithAsset(context, exchangeAddress, chain.asset).then(([marginStressAddress, _bump]) => {
                                                                    findOptifiUSDCPoolAuthPDA(context).then(([centralUsdcPoolAuth,]) => {
                                                                        let marketMakerCalculationTx = context.program.rpc.mmCalculation(
                                                                            {
                                                                                accounts: {
                                                                                    optifiExchange: exchangeAddress,
                                                                                    marginStressAccount: marginStressAddress,
                                                                                    userAccount: userAccountAddress,
                                                                                    userMarginAccount: userAcctRaw.userMarginAccountUsdc,
                                                                                    marketMakerAccount: marketMakerAccount,
                                                                                    optifiMarket: marketAddress,
                                                                                    userInstrumentLongTokenVault: userLongTokenVault,
                                                                                    serumMarket: optifiMarket.serumMarket,
                                                                                    openOrders: userOpenOrdersAccount,
                                                                                    eventQueue: serumMarket.decoded.eventQueue,
                                                                                    bids: serumMarket.bidsAddress,
                                                                                    asks: serumMarket.asksAddress,
                                                                                    serumDexProgramId: serumProgramId,
                                                                                    // usdcFeePool: exchangeInfo.usdcFeePool,
                                                                                    // centralUsdcPoolAuth: centralUsdcPoolAuth,
                                                                                },
                                                                                preInstructions: [increaseComputeUnitsIx]
                                                                            });
                                                                        marketMakerCalculationTx.then((res) => {
                                                                            console.log("Successfully executed market maker calculation",
                                                                                formatExplorerAddress(context, res as string,
                                                                                    SolanaEntityType.Transaction));
                                                                            resolve({
                                                                                successful: true,
                                                                                data: res as TransactionSignature
                                                                            })
                                                                        }).catch((err) => {
                                                                            console.error(err);
                                                                            reject(err);
                                                                        })
                                                                    }).catch((err) => reject(err))
                                                                }).catch((err) => reject(err))
                                                            }).catch((err) => reject(err))
                                                    }).catch((err) => reject(err))
                                                }).catch((err) => reject(err))
                                            }).catch((err) => reject(err))
                                        }).catch((err) => reject(err))
                                    }).catch((err) => reject(err))
                                }).catch((err) => reject(err))
                        }).catch((err) => reject(err))
                    }).catch((err) => reject(err))
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}