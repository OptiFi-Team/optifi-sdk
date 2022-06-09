import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, SYSVAR_RENT_PUBKEY, TransactionInstruction, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findMarketMakerAccount, findUserAccount, getDexOpenOrders } from "../../utils/accounts";
import { findAssociatedTokenAccount } from "../../utils/token";
import { SERUM_DEX_PROGRAM_ID, USDC_DECIMALS, USDC_TOKEN_MINT } from "../../constants";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";
import { findOptifiMarketMintAuthPDA, findOptifiUSDCPoolAuthPDA, findSerumAuthorityPDA, getAmmLiquidityAuthPDA } from "../../utils/pda";
import { getSerumMarket } from "../../utils/serum";
import { deriveVaultNonce } from "../../utils/market";
import { Chain, OptifiMarket, OrderSide } from "../../types/optifi-exchange-types";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { findMarginStressWithAsset } from "../../utils/margin";
import { numberAssetToDecimal } from "../../utils/generic";
import { calculatePcQtyAndFee } from "../../utils/orders";
import OrderType from "../../types/OrderType";
import BN from "bn.js";
import marginStress from "../marginStress";

export default function marketMakerPostOnlyOrder(
    context: Context,
    marketAddress: PublicKey,
    side: OrderSide,
    price: number,
    size: number,
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

                                                                                let instructions = await marginStress(context, chain.asset);

                                                                                instructions.push(marketMakerCalculationTx);

                                                                                let limit = price * (10 ** USDC_DECIMALS) / (10 ** numberAssetToDecimal(chain.asset)!); // price for 1 lot_size 
                                                                                let maxCoinQty = size * (10 ** numberAssetToDecimal(chain.asset)!);
                                                                                let PcQty = limit * maxCoinQty;
                                                                                let [totalPcQty, maxPcQty, totalFee] = calculatePcQtyAndFee(context, PcQty, side, OrderType.PostOnly, false)!;
                                                                                let marketMakerPostOnlyOrderTx = context.program.rpc.mmPostOnlyOrder(
                                                                                    side,
                                                                                    new BN(limit),
                                                                                    new BN(maxCoinQty),
                                                                                    new BN(maxPcQty),
                                                                                    {
                                                                                        accounts: {
                                                                                            optifiExchange: exchangeAddress,
                                                                                            marginStressAccount: marginStressAddress,
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
                                                                                            instrumentTokenMintAuthorityPda: mintAuthAddress,
                                                                                            instrumentShortSplTokenMint: optifiMarket.instrumentShortSplToken,
                                                                                            serumDexProgramId: serumProgramId,
                                                                                            tokenProgram: TOKEN_PROGRAM_ID,
                                                                                            rent: SYSVAR_RENT_PUBKEY,
                                                                                        },
                                                                                        instructions
                                                                                    });
                                                                                marketMakerPostOnlyOrderTx.then((res) => {
                                                                                    console.log("Successfully placed market maker post-only order",
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
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}