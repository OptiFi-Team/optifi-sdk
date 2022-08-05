import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findOracleAccountFromInstrument, findOracleAccountFromAsset, findUserAccount, getDexOpenOrders, OracleAccountType } from "../../utils/accounts";
import { AmmAccount, Asset } from "../../types/optifi-exchange-types";
import { deriveVaultNonce, findMarketInstrumentContext } from "../../utils/market";
import { SERUM_DEX_PROGRAM_ID } from "../../constants";
import { findSerumAuthorityPDA, findSerumPruneAuthorityPDA, getAmmLiquidityAuthPDA } from "../../utils/pda";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { findAssociatedTokenAccount } from "../../utils/token";
import { getSerumMarket } from "../../utils/serum";
import { increaseComputeUnitsIx } from "../../utils/transactions";


export default function recordPnlForAmm(context: Context,
    ammToSettle: PublicKey,
    market: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        let [ammLiquidityAuth, ammLiquidityAuthBump] = await getAmmLiquidityAuthPDA(context);

        context.program.account.ammAccount.fetch(ammToSettle).then((ammRes) => {
            // @ts-ignore
            let amm = ammRes as AmmAccount;
            findExchangeAccount(context).then(([exchangeAddress, _]) => {
                findMarketInstrumentContext(context, market).then((marketContext) => {
                    findSerumAuthorityPDA(context).then(([serumMarketAuthorityAddress, _]) => {
                        findOracleAccountFromInstrument(context, marketContext.optifiMarket.instrument).then((oracleSpotAccount) =>
                            deriveVaultNonce(marketContext.optifiMarket.serumMarket, new PublicKey(SERUM_DEX_PROGRAM_ID[context.cluster]))
                                .then(([vaultAddress, nonce]) => {
                                    getSerumMarket(context, marketContext.optifiMarket.serumMarket).then((serumMarket) => {
                                        getDexOpenOrders(context, marketContext.optifiMarket.serumMarket, ammLiquidityAuth).then(([openOrdersAccount, _]) => {
                                            findAssociatedTokenAccount(context, marketContext.optifiMarket.instrumentLongSplToken, ammLiquidityAuth).then(([userLongTokenVault, _]) => {
                                                findAssociatedTokenAccount(context, marketContext.optifiMarket.instrumentShortSplToken, ammLiquidityAuth).then(async ([userShortTokenVault, _]) => {
                                                    let recordPnlForAmmTx = context.program.rpc.recordPnlForAmm(
                                                        ammLiquidityAuthBump,
                                                        {
                                                            accounts: {
                                                                optifiExchange: exchangeAddress,
                                                                ammAccount: ammToSettle,
                                                                optifiMarket: market,
                                                                serumMarket: marketContext.optifiMarket.serumMarket,
                                                                ammSerumOpenOrders: openOrdersAccount,
                                                                instrument: marketContext.optifiMarket.instrument,
                                                                bids: serumMarket.bidsAddress,
                                                                asks: serumMarket.asksAddress,
                                                                eventQueue: serumMarket.decoded.eventQueue,
                                                                coinVault: serumMarket.decoded.baseVault,
                                                                pcVault: serumMarket.decoded.quoteVault,
                                                                vaultSigner: vaultAddress,
                                                                ammUsdcVault: amm.quoteTokenVault,
                                                                instrumentLongSplTokenMint: marketContext.optifiMarket.instrumentLongSplToken,
                                                                instrumentShortSplTokenMint: marketContext.optifiMarket.instrumentShortSplToken,
                                                                ammInstrumentLongTokenVault: userLongTokenVault,
                                                                ammInstrumentShortTokenVault: userShortTokenVault,
                                                                pruneAuthority: serumMarketAuthorityAddress,
                                                                serumDexProgramId: new PublicKey(SERUM_DEX_PROGRAM_ID[context.cluster]),
                                                                tokenProgram: TOKEN_PROGRAM_ID,
                                                                clock: SYSVAR_CLOCK_PUBKEY,
                                                                assetSpotPriceOracleFeed: oracleSpotAccount,
                                                                usdcSpotPriceOracleFeed: await findOracleAccountFromAsset(context, Asset.USDC, OracleAccountType.Spot),
                                                                ammLiquidityAuth: ammLiquidityAuth,
                                                            },
                                                            preInstructions: [increaseComputeUnitsIx]
                                                        })
                                                    recordPnlForAmmTx.then((res) => {
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
                                })).catch((err) => reject(err))
                    }).catch((err) => reject(err))
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
        // }).catch((err) => reject(err))
    })
}

