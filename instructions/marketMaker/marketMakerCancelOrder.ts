import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, SYSVAR_RENT_PUBKEY, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findMarketMakerAccount, findUserAccount, getDexOpenOrders } from "../../utils/accounts";
import { findAssociatedTokenAccount } from "../../utils/token";
import { SERUM_DEX_PROGRAM_ID, USDC_TOKEN_MINT } from "../../constants";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";
import { findOptifiMarketMintAuthPDA, findOptifiUSDCPoolAuthPDA, findSerumAuthorityPDA, getAmmLiquidityAuthPDA } from "../../utils/pda";
import { getSerumMarket } from "../../utils/serum";
import { deriveVaultNonce } from "../../utils/market";
import { Chain, OptifiMarket } from "../../types/optifi-exchange-types";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { findMarginStressWithAsset } from "../../utils/margin";
import marginStress from "../marginStress";
import { increaseComputeUnitsIx } from "../../utils/transactions";

export default function marketMakerCancelOrder(
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
                                                deriveVaultNonce(optifiMarket.serumMarket, serumProgramId).then(([vaultSigner, vaultNonce]) => {
                                                    findSerumAuthorityPDA(context).then(([serumMarketAuthority, bump2]) => {
                                                        findOptifiMarketMintAuthPDA(context).then(([mintAuthAddress, _]) => {
                                                            findAssociatedTokenAccount(context, optifiMarket.instrumentLongSplToken, userAccountAddress).then(([userLongTokenVault, _]) => {
                                                                findAssociatedTokenAccount(context, optifiMarket.instrumentShortSplToken, userAccountAddress).then(([userShortTokenVault, _]) => {
                                                                    context.program.account.chain
                                                                        .fetch(marketRes.instrument).then(chainRes => {
                                                                            // @ts-ignore
                                                                            let chain = chainRes as Chain;
                                                                            findMarginStressWithAsset(context, exchangeAddress, chain.asset).then(async ([marginStressAddress, _bump]) => {
                                                                                let marketMakerCalculationTx = context.program.instruction.mmCalculation(
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
                                                                                        }
                                                                                    });


                                                                                let instructions = [increaseComputeUnitsIx]
                                                                                let marginStressIx = await marginStress(context, chain.asset);
                                                                                instructions.push(...marginStressIx)
                                                                                instructions.push(marketMakerCalculationTx);

                                                                                let marketMakerCancelOrderTx = context.program.rpc.mmCancelOrder({
                                                                                    accounts: {
                                                                                        optifiExchange: exchangeAddress,
                                                                                        userAccount: userAccountAddress,
                                                                                        userMarginAccount: userAcctRaw.userMarginAccountUsdc,
                                                                                        marketMakerAccount: marketMakerAccount,
                                                                                        user: context.provider.wallet.publicKey,
                                                                                        userInstrumentLongTokenVault: userLongTokenVault,
                                                                                        userInstrumentShortTokenVault: userShortTokenVault,
                                                                                        optifiMarket: marketAddress,
                                                                                        serumMarket: optifiMarket.serumMarket,
                                                                                        openOrders: userOpenOrdersAccount,
                                                                                        requestQueue: serumMarket.decoded.requestQueue,
                                                                                        eventQueue: serumMarket.decoded.eventQueue,
                                                                                        bids: serumMarket.bidsAddress,
                                                                                        asks: serumMarket.asksAddress,
                                                                                        coinMint: serumMarket.decoded.baseMint,
                                                                                        coinVault: serumMarket.decoded.baseVault,
                                                                                        pcVault: serumMarket.decoded.quoteVault,
                                                                                        vaultSigner: vaultSigner,
                                                                                        instrumentShortSplTokenMint: optifiMarket.instrumentShortSplToken,
                                                                                        pruneAuthority: serumMarketAuthority,
                                                                                        serumDexProgramId: serumProgramId,
                                                                                        tokenProgram: TOKEN_PROGRAM_ID,
                                                                                    },
                                                                                    instructions
                                                                                });
                                                                                marketMakerCancelOrderTx.then((res) => {
                                                                                    console.log("Successfully cancelled market maker order",
                                                                                        formatExplorerAddress(context, res as string,
                                                                                            SolanaEntityType.Transaction));
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
                                }).catch((err) => reject(err))
                        }).catch((err) => reject(err))
                    }).catch((err) => reject(err))
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}