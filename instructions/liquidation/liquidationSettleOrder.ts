import Context from "../../types/context";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findLiquidationState, getDexOpenOrders } from "../../utils/accounts";
import { OptifiMarket } from "../../types/optifi-exchange-types";
import { findAssociatedTokenAccount, findOrCreateAssociatedTokenAccount } from "../../utils/token";
import { SERUM_DEX_PROGRAM_ID } from "../../constants";
import { increaseComputeUnitsIx } from "../../utils/transactions";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import InstructionResult from "../../types/instructionResult";
import { getSerumMarket } from "../../utils/serum";
import { deriveVaultNonce } from "../../utils/market";
import { findMarginStressWithAsset } from "../../utils/margin";
import marginStress from "../marginStress";

export default function liquidationSettleOrder(context: Context,
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
                                                let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.cluster]);
                                                deriveVaultNonce(market.serumMarket, serumId).then(([vaultOwner, _]) => {
                                                    context.program.account.chain
                                                        .fetch(market.instrument)
                                                        .then((chainRes) => {
                                                            // @ts-ignore
                                                            let chain = chainRes as Chain;
                                                            findMarginStressWithAsset(context, exchangeAddress, chain.asset).then(async ([marginStressAddress, _bump]) => {
                                                                let ixs = [increaseComputeUnitsIx]
                                                                ixs.push(...await marginStress(context, chain.asset));

                                                                let ix1 = context.program.instruction.liquidationSettleOrder(
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
                                                                            coinVault: serumMarket.decoded.baseVault,
                                                                            pcVault: serumMarket.decoded.quoteVault,
                                                                            vaultSigner:
                                                                                vaultOwner,
                                                                            instrumentLongSplTokenMint:
                                                                                serumMarket.decoded
                                                                                    .baseMint,
                                                                            instrumentShortSplTokenMint:
                                                                                market.instrumentShortSplToken,
                                                                            serumDexProgramId: new PublicKey(SERUM_DEX_PROGRAM_ID[context.cluster]),
                                                                            tokenProgram: TOKEN_PROGRAM_ID,
                                                                            liquidator: context.provider.wallet.publicKey,
                                                                        }
                                                                    }
                                                                );
                                                                ixs.push(ix1);
                                                                context.program.rpc.userMarginCalculate(
                                                                    {
                                                                        accounts: {
                                                                            optifiExchange: exchangeAddress,
                                                                            marginStressAccount: marginStressAddress,
                                                                            userAccount: userAccountAddress,
                                                                        },
                                                                        instructions: ixs
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
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}