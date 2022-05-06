import Context from "../../types/context";
import { PublicKey, SYSVAR_RENT_PUBKEY, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findLiquidationState, getDexOpenOrders } from "../../utils/accounts";
import { OptifiMarket } from "../../types/optifi-exchange-types";
import { findAssociatedTokenAccount, findOrCreateAssociatedTokenAccount } from "../../utils/token";
import { SERUM_DEX_PROGRAM_ID } from "../../constants";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import InstructionResult from "../../types/instructionResult";
import { getSerumMarket } from "../../utils/serum";
import { deriveVaultNonce } from "../../utils/market";
import { findMarginStressWithAsset } from "../../utils/margin";
import { findSerumAuthorityPDA } from "../../utils/pda";

export default function liquidationPlaceOrder(context: Context,
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
                                    findSerumAuthorityPDA(context).then(([serumMarketAuthority, _]) => {
                                        context.program.account.userAccount.fetch(userAccountAddress).then((userAccount) => {

                                            let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint]);
                                            deriveVaultNonce(market.serumMarket, serumId).then(async ([vaultOwner, _]) => {
                                                let chainRes = await context.program.account.chain
                                                    .fetch(marketRes.instrument)
                                                // @ts-ignore
                                                let chain = chainRes as Chain;

                                                let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, chain.asset);

                                                console.log("liquidatePosition...");

                                                context.program.rpc.liquidationPlaceOrder(
                                                    {
                                                        accounts: {
                                                            optifiExchange: exchangeAddress,
                                                            marginStressAccount: marginStressAddress,
                                                            userAccount: userAccountAddress,
                                                            userMarginAccount: userAccount.userMarginAccountUsdc,
                                                            liquidationState: liquidationStateAddress,
                                                            userInstrumentLongTokenVault: userLongTokenAddress,
                                                            userInstrumentShortTokenVault:
                                                                userShortTokenAddress,
                                                            optifiMarket: marketAddress,
                                                            instrumentLongSplTokenMint: market.instrumentLongSplToken,
                                                            instrumentShortSplTokenMint: market.instrumentShortSplToken,
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
                                                            pruneAuthority: serumMarketAuthority,
                                                            vaultSigner: vaultOwner,
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