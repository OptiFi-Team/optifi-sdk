import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, TransactionInstruction, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findOracleAccountFromAsset, findOracleAccountFromInstrument, getDexOpenOrders, OracleAccountType } from "../../utils/accounts";
import { Asset, Chain, OptifiMarket, UserAccount } from "../../types/optifi-exchange-types";
import { deriveVaultNonce, findMarketInstrumentContext } from "../../utils/market";
import { SERUM_DEX_PROGRAM_ID } from "../../constants";
import { findSerumAuthorityPDA, findSerumPruneAuthorityPDA } from "../../utils/pda";
import { increaseComputeUnitsIx, signAndSendTransaction } from "../../utils/transactions";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { findAssociatedTokenAccount } from "../../utils/token";
import { getSerumMarket } from "../../utils/serum";
import marginStress from "../marginStress";
import { findMarginStressWithAsset } from "../../utils/margin";


export default function recordPnl(context: Context,
    userToSettle: PublicKey,
    market: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        // findUserAccount(context).then(([userAccountAddress, _]) => {
        let userAccountAddress = userToSettle
        context.program.account.userAccount.fetch(userAccountAddress).then((userAcctRaw) => {
            // @ts-ignore
            let userAccount = userAcctRaw as UserAccount;
            findExchangeAccount(context).then(([exchangeAddress, _]) => {
                findMarketInstrumentContext(context, market).then((marketContext) => {
                    findSerumAuthorityPDA(context).then(([serumMarketAuthorityAddress, _]) => {
                        findOracleAccountFromInstrument(context, marketContext.optifiMarket.instrument).then((oracleSpotAccount) =>
                            deriveVaultNonce(marketContext.optifiMarket.serumMarket, new PublicKey(SERUM_DEX_PROGRAM_ID[context.cluster]))
                                .then(([vaultAddress, nonce]) => {
                                    getSerumMarket(context, marketContext.optifiMarket.serumMarket).then((serumMarket) => {
                                        getDexOpenOrders(context, marketContext.optifiMarket.serumMarket, userToSettle).then(([openOrdersAccount, _]) => {
                                            findAssociatedTokenAccount(context, marketContext.optifiMarket.instrumentLongSplToken, userAccountAddress).then(([userLongTokenVault, _]) => {
                                                findAssociatedTokenAccount(context, marketContext.optifiMarket.instrumentShortSplToken, userAccountAddress).then(async ([userShortTokenVault, _]) => {

                                                    let ixs: TransactionInstruction[] = [increaseComputeUnitsIx]
                                                    let recordPnlForOneUserInx = context.program.instruction.recordPnlForOneUser({
                                                        accounts: {
                                                            optifiExchange: exchangeAddress,
                                                            userAccount: userToSettle,
                                                            optifiMarket: market,
                                                            serumMarket: marketContext.optifiMarket.serumMarket,
                                                            userSerumOpenOrders: openOrdersAccount,
                                                            instrument: marketContext.optifiMarket.instrument,
                                                            bids: serumMarket.bidsAddress,
                                                            asks: serumMarket.asksAddress,
                                                            eventQueue: serumMarket.decoded.eventQueue,
                                                            coinVault: serumMarket.decoded.baseVault,
                                                            pcVault: serumMarket.decoded.quoteVault,
                                                            vaultSigner: vaultAddress,
                                                            userMarginAccountUsdc: userAccount.userMarginAccountUsdc,
                                                            instrumentLongSplTokenMint: marketContext.optifiMarket.instrumentLongSplToken,
                                                            instrumentShortSplTokenMint: marketContext.optifiMarket.instrumentShortSplToken,
                                                            userInstrumentLongTokenVault: userLongTokenVault,
                                                            userInstrumentShortTokenVault: userShortTokenVault,
                                                            pruneAuthority: serumMarketAuthorityAddress,
                                                            serumDexProgramId: new PublicKey(SERUM_DEX_PROGRAM_ID[context.cluster]),
                                                            tokenProgram: TOKEN_PROGRAM_ID,
                                                            clock: SYSVAR_CLOCK_PUBKEY,
                                                            assetSpotPriceOracleFeed: oracleSpotAccount,
                                                            usdcSpotPriceOracleFeed: await findOracleAccountFromAsset(context, Asset.USDC, OracleAccountType.Spot)
                                                        }
                                                    })

                                                    ixs.push(recordPnlForOneUserInx)

                                                    // let tx = await context.program.instruction.userMarginCalculate()

                                                    let instrumentInfo = await context.program.account.chain.fetch(marketContext.optifiMarket.instrument)
                                                    let asset = instrumentInfo.asset as number
                                                    let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, asset);
                                                    let marginStressInx = await marginStress(context, asset);
                                                    ixs.push(...marginStressInx)

                                                    let recordPnlRes = await context.program.rpc.userMarginCalculate(
                                                        {
                                                            accounts: {
                                                                optifiExchange: exchangeAddress,
                                                                marginStressAccount: marginStressAddress,
                                                                userAccount: userToSettle,
                                                                clock: SYSVAR_CLOCK_PUBKEY
                                                            },
                                                            instructions: ixs
                                                        }
                                                    )
                                                    resolve({
                                                        successful: true,
                                                        data: recordPnlRes as TransactionSignature
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

