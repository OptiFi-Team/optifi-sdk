import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import { Keypair, PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY, SYSVAR_RENT_PUBKEY, TransactionInstruction, TransactionSignature } from "@solana/web3.js";
import { OptifiMarket } from "../types/optifi-exchange-types";
import { findOrCreateAssociatedTokenAccount } from "../utils/token";
import { findOptifiExchange, getDexOpenOrders } from "../utils/accounts";
import { signAndSendTransaction, TransactionResultType } from "../utils/transactions";
import { formatExplorerAddress, SolanaEntityType } from "../utils/debug";
import { findSerumAuthorityPDA, getAmmLiquidityAuthPDA } from "../utils/pda";
import { SERUM_DEX_PROGRAM_ID } from "../constants";
import { findAssociatedTokenAccount } from "../utils/token";
import { createAssociatedTokenAccountInstruction } from "@solana/spl-token";

export default function addInstrumentToAmm(context: Context,
    ammAddress: PublicKey,
    marketAddress: PublicKey,): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        context.program.account.optifiMarket.fetch(marketAddress).then((marketRes) => {
            let optifiMarket = marketRes as OptifiMarket;
            // findOrCreateAssociatedTokenAccount(context, optifiMarket.instrumentLongSplToken, ammAddress).then((ammLongTokenVault) => {
            //     findOrCreateAssociatedTokenAccount(context, optifiMarket.instrumentShortSplToken, ammAddress).then((ammShortTokenVault) => {
            findOptifiExchange(context).then(async ([exchangeAddress, _]) => {
                try {
                    let inxs: TransactionInstruction[] = []

                    let [ammLiquidityAuth,] = await getAmmLiquidityAuthPDA(context);
                    let [dexOpenOrders, bump2] = await getDexOpenOrders(
                        context,
                        optifiMarket.serumMarket,
                        ammLiquidityAuth)
                    let dexOpenOrdersInfo = await context.connection.getAccountInfo(dexOpenOrders)
                    if (!dexOpenOrdersInfo) {
                        let [serumMarketAuthority,] = await findSerumAuthorityPDA(context);
                        let initAmmOnOptifiMarketInx = context.program.instruction.initAmmOnOptifiMarket(bump2, {
                            accounts: {
                                optifiExchange: exchangeAddress,
                                ammAuthority: ammLiquidityAuth,
                                serumOpenOrders: dexOpenOrders,
                                optifiMarket: marketAddress,
                                serumMarketAuthority: serumMarketAuthority,
                                serumMarket: optifiMarket.serumMarket,
                                serumDexProgramId: SERUM_DEX_PROGRAM_ID[context.cluster],
                                payer: context.provider.wallet.publicKey,
                                systemProgram: SystemProgram.programId,
                                rent: SYSVAR_RENT_PUBKEY,
                            }
                        });
                        inxs.push(initAmmOnOptifiMarketInx)
                    }


                    // let ammLongTokenVault = await findOrCreateAssociatedTokenAccount(context, optifiMarket.instrumentLongSplToken, ammLiquidityAuth)
                    // let ammShortTokenVault = await findOrCreateAssociatedTokenAccount(context, optifiMarket.instrumentShortSplToken, ammLiquidityAuth)

                    let [ammLongTokenVault,] = await findAssociatedTokenAccount(context, optifiMarket.instrumentLongSplToken, ammLiquidityAuth)
                    let [ammShortTokenVault,] = await findAssociatedTokenAccount(context, optifiMarket.instrumentShortSplToken, ammLiquidityAuth)
                    let [ammLongTokenVaultInfo, ammShortTokenVaultInfo] = await Promise.all([
                        context.connection.getAccountInfo(ammLongTokenVault),
                        context.connection.getAccountInfo(ammShortTokenVault)
                    ])

                    if (!ammLongTokenVaultInfo) {
                        inxs.push(
                            createAssociatedTokenAccountInstruction(
                                context.provider.wallet.publicKey,
                                ammLongTokenVault,
                                ammLiquidityAuth,
                                optifiMarket.instrumentLongSplToken
                            )
                        )
                    }
                    if (!ammShortTokenVaultInfo) {
                        inxs.push(
                            createAssociatedTokenAccountInstruction(
                                context.provider.wallet.publicKey,
                                ammShortTokenVault,
                                ammLiquidityAuth,
                                optifiMarket.instrumentShortSplToken
                            )
                        )
                    }

                    context.program.rpc.ammAddInstrument({
                        accounts: {
                            optifiExchange: exchangeAddress,
                            amm: ammAddress,
                            optifiMarket: marketAddress,
                            instrument: optifiMarket.instrument,
                        },
                        instructions: inxs

                    }).then((addMarketRes) => {
                        resolve({
                            successful: true,
                            data: addMarketRes as TransactionSignature
                        })
                    }).catch((err) => {
                        console.error(err);
                        reject(err);
                    })
                } catch (err) {
                    reject(err);
                }
            })
            //     })
            // })
        })
    })
}