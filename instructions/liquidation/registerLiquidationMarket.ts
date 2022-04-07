import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, SYSVAR_RENT_PUBKEY, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findLiquidationState, getDexOpenOrders } from "../../utils/accounts";
import { Chain, OptifiMarket } from "../../types/optifi-exchange-types";
import { findAssociatedTokenAccount } from "../../utils/token";
import { SERUM_DEX_PROGRAM_ID } from "../../constants";
import { signAndSendTransaction, TransactionResultType } from "../../utils/transactions";
import { getSerumMarket } from "../../utils/serum";
import { findMarginStressWithAsset } from "../../utils/margin";
import { optifiAssetToNumber } from "../../utils/generic";
import { findSerumAuthorityPDA } from "../../utils/pda";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { deriveVaultNonce } from "../../utils/market";

export default function registerLiquidationMarket(context: Context,
    userAccountAddress: PublicKey,
    marketAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.optifiMarket.fetch(marketAddress).then((marketRes) => {
                let market = marketRes as OptifiMarket;
                getDexOpenOrders(context, market.serumMarket, userAccountAddress).then(([openOrdersAccount, _]) => {
                    findAssociatedTokenAccount(context, market.instrumentLongSplToken, userAccountAddress).then(([userLongTokenAddress, _]) => {
                        findAssociatedTokenAccount(context, market.instrumentShortSplToken, userAccountAddress).then(([userShortTokenAddress, _]) => {
                            findLiquidationState(context, userAccountAddress).then(([liquidationStateAddress, _]) => {
                                getSerumMarket(context, market.serumMarket).then(async (serumMarket) => {
                                    let chainRes = await context.program.account.chain
                                        .fetch(marketRes.instrument)
                                    // @ts-ignore
                                    let chain = chainRes as Chain;
                                    let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, chain.asset);
                                    let [serumMarketAuthority,] = await findSerumAuthorityPDA(context);

                                    let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint]);
                                    let [vaultOwner, _] = await deriveVaultNonce(market.serumMarket, serumId);

                                    let userAccount = await context.program.account.userAccount.fetch(userAccountAddress);


                                    console.log(openOrdersAccount.toString());
                                    context.program.rpc.liquidationRegister(
                                        {
                                            accounts: {
                                                optifiExchange: exchangeAddress,
                                                userAccount: userAccountAddress,
                                                userMarginAccount:
                                                    userAccount.userMarginAccountUsdc,
                                                marginStressAccount: marginStressAddress,
                                                liquidationState: liquidationStateAddress,
                                                market: marketAddress,
                                                serumMarket: market.serumMarket,
                                                serumDexProgramId: serumId,
                                                bids: serumMarket.bidsAddress,
                                                asks: serumMarket.asksAddress,
                                                eventQueue: serumMarket.decoded.eventQueue,
                                                openOrders: openOrdersAccount,
                                                openOrdersOwner: userAccountAddress, // duplicate, should be removed
                                                pruneAuthority: serumMarketAuthority,
                                                coinVault:
                                                    serumMarket.decoded
                                                        .baseVault,
                                                pcVault:
                                                    serumMarket.decoded
                                                        .quoteVault,
                                                vaultSigner:
                                                    vaultOwner,
                                                tokenProgram:
                                                    TOKEN_PROGRAM_ID,
                                                rent: SYSVAR_RENT_PUBKEY,
                                                instrumentLongSplTokenMint:
                                                    serumMarket.decoded
                                                        .baseMint,
                                                instrumentShortSplTokenMint:
                                                    market.instrumentShortSplToken,
                                                userInstrumentLongTokenVault: userLongTokenAddress,
                                                userInstrumentShortTokenVault: userShortTokenAddress
                                            }
                                        }
                                    ).then((res) => {
                                        resolve({
                                            successful: true,
                                            data: res as TransactionSignature
                                        })
                                    }).catch((err) => reject(err))
                                })
                            })
                        })
                    })
                })
            }).catch((err) => reject(err))
        })
    })
}