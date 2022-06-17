import Context from "../../types/context";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findLiquidationState, getDexOpenOrders } from "../../utils/accounts";
import { OptifiMarket } from "../../types/optifi-exchange-types";
import { findAssociatedTokenAccount, findOrCreateAssociatedTokenAccount } from "../../utils/token";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import InstructionResult from "../../types/instructionResult";
import { getSerumMarket } from "../../utils/serum";
import { findMarginStressWithAsset } from "../../utils/margin";
import { findOptifiMarketMintAuthPDA, getAmmLiquidityAuthPDA } from "../../utils/pda";
import { findAMMAccounts } from "../../utils/amm";

export default function liquidationToAmm(context: Context,
    userAccountAddress: PublicKey,
    marketAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.optifiMarket.fetch(marketAddress).then((marketRes) => {
                let market = marketRes as OptifiMarket;
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
                                ).then(async (shortSPLTokenVault) => {

                                    let chainRes = await context.program.account.chain
                                        .fetch(marketRes.instrument)
                                    // @ts-ignore
                                    let chain = chainRes as Chain;

                                    let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, chain.asset);

                                    let [mintAuthAddress] = await findOptifiMarketMintAuthPDA(context);

                                    let [ammLiquidityAuth] = await getAmmLiquidityAuthPDA(context)

                                    let [ammLongTokenVault] = await findAssociatedTokenAccount(context, market.instrumentLongSplToken, ammLiquidityAuth);

                                    let [ammShortTokenVault] = await findAssociatedTokenAccount(context, market.instrumentShortSplToken, ammLiquidityAuth);

                                    console.log("liquidationToAmm...");
                                    let ammAccounts = await findAMMAccounts(context)
                                    let ammForLiquidation = ammAccounts.filter(amm => {
                                        amm[0].tradingInstruments.map(e => e.toString()).includes(market.instrument.toString())
                                    })
                                    context.program.rpc.liquidationToAmm(
                                        {
                                            accounts: {
                                                optifiExchange: exchangeAddress,
                                                marginStressAccount: marginStressAddress,
                                                amm: ammForLiquidation[0][1],
                                                userAccount: userAccountAddress,
                                                userMarginAccount: userAccount.userMarginAccountUsdc,
                                                liquidationState: liquidationStateAddress,
                                                userInstrumentLongTokenVault:
                                                    longSPLTokenVault,
                                                userInstrumentShortTokenVault:
                                                    shortSPLTokenVault,
                                                instrumentLongSplTokenMint:
                                                    serumMarket.decoded
                                                        .baseMint,
                                                instrumentShortSplTokenMint:
                                                    market.instrumentShortSplToken,
                                                instrumentTokenMintAuthorityPda: mintAuthAddress,
                                                optifiMarket: marketAddress,
                                                pcVault: serumMarket.decoded.quoteVault,
                                                tokenProgram: TOKEN_PROGRAM_ID,
                                                liquidator: context.provider.wallet.publicKey,
                                                ammInstrumentLongTokenVault: ammLongTokenVault,
                                                ammInstrumentShortTokenVault: ammShortTokenVault,
                                                ammLiquidityAuth: ammLiquidityAuth,
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
    })
}