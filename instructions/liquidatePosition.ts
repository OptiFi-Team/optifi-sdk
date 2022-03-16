import Context from "../types/context";
import { PublicKey, SYSVAR_RENT_PUBKEY, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findLiquidationState, getDexOpenOrders } from "../utils/accounts";
import { OptifiMarket } from "../types/optifi-exchange-types";
import { findAssociatedTokenAccount, findOrCreateAssociatedTokenAccount } from "../utils/token";
import { SERUM_DEX_PROGRAM_ID } from "../constants";
import { signAndSendTransaction, TransactionResultType } from "../utils/transactions";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import InstructionResult from "../types/instructionResult";
import { getSerumMarket } from "../utils/serum";

export default function liquidatePosition(context: Context,
    userAccountAddress: PublicKey,
    marketAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.optifiMarket.fetch(marketAddress).then((marketRes) => {
                let market = marketRes as OptifiMarket;
                getDexOpenOrders(context, market.serumMarket, userAccountAddress).then((openOrdersAccount) => {
                    findAssociatedTokenAccount(context, market.instrumentLongSplToken, userAccountAddress).then(([userLongTokenAddress, _]) => {
                        findAssociatedTokenAccount(context, market.instrumentShortSplToken, userAccountAddress).then(([userShortTokenAddress, _]) => {
                            findLiquidationState(context, userAccountAddress).then(([liquidationStateAddress, _]) => {
                                getSerumMarket(context, market.serumMarket).then((serumMarket) => {
                                    context.program.account.userAccount.fetch(userAccountAddress).then((userAccount) => {
                                        findOrCreateAssociatedTokenAccount(
                                            context,
                                            market.instrumentLongSplToken,
                                            userAccountAddress
                                        ).then((longSPLTokenVault) => {
                                            findOrCreateAssociatedTokenAccount(
                                                context,
                                                market.instrumentShortSplToken,
                                                userAccountAddress
                                            ).then((shortSPLTokenVault) => {
                                                context.program.rpc.liquidatePosition(
                                                    {
                                                        accounts: {
                                                            optifiExchange: exchangeAddress,
                                                            userAccount: userAccountAddress,
                                                            userMarginAccount: userAccount.userMarginAccountUsdc,
                                                            liquidationState: liquidationStateAddress,
                                                            userInstrumentLongTokenVault:
                                                                longSPLTokenVault,
                                                            userInstrumentShortTokenVault:
                                                                shortSPLTokenVault,
                                                            optifiMarket: marketAddress,
                                                            serumMarket: market.serumMarket,
                                                            openOrders: openOrdersAccount[0],
                                                            requestQueue: serumMarket.decoded.requestQueue,
                                                            eventQueue: serumMarket.decoded.eventQueue,
                                                            bids: serumMarket.bidsAddress,
                                                            asks: serumMarket.asksAddress,
                                                            coinVault: serumMarket.decoded.baseVault,
                                                            pcVault: serumMarket.decoded.quoteVault,
                                                            serumDexProgramId: new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint]),
                                                            tokenProgram: TOKEN_PROGRAM_ID,
                                                            rent: SYSVAR_RENT_PUBKEY,
                                                            liquidator: context.provider.wallet.publicKey,
                                                        }
                                                    }
                                                ).then((res) => {
                                                    resolve({
                                                        successful: true,
                                                        data: res as TransactionSignature
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
    })
}