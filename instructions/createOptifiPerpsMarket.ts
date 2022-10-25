import Context from "../types/context";
import { PublicKey, TransactionSignature, SystemProgram } from "@solana/web3.js";
import InstrumentType from "../types/instrumentType";
import { Duration } from "../types/optifi-exchange-types";
import { createSerumMarkets } from "../sequences/boostrap";
import Asset from "../types/asset";
import { findExchangeAccount, findAccountWithSeeds } from "../utils/accounts";
import {
    assetToOptifiAsset,
    optifiAssetToNumber,
} from "../utils/generic";
import * as anchor from "@project-serum/anchor";
import { increaseComputeUnitsIx, signAndSendTransaction, TransactionResultType } from "../utils/transactions";
import { formatExplorerAddress, SolanaEntityType } from "../utils/debug";
import { getSerumMarket } from "../utils/serum";
import { findPerpsInstrument, findPerpAccount } from "../utils/accounts"
import { OPTIFI_MARKET_PREFIX } from "../constants";
/**
 * Create new perps instruments for an exchange
 *
 * @param context
 */
export function createPerpsInstrumentsAndMarkets(context: Context, asset: Asset): Promise<PublicKey[]> {
    return new Promise(async (resolve, reject) => {
        try {
            //1. prepare instrument data
            let exchangeAddress = await findExchangeAccount(context)

            let perpsInstrument = await findPerpsInstrument(
                context,
                asset,
                exchangeAddress[0],
            )

            let perpAccount = await findPerpAccount(
                context,
                asset,
                exchangeAddress[0],
            )

            let derivedMarketAddress = findAccountWithSeeds(context, [
                Buffer.from(OPTIFI_MARKET_PREFIX),
                Buffer.from(exchangeAddress.toString()),
                // new anchor.BN(idx).toArrayLike(Buffer, "be", 8)// TODO optifi_market.rs ->exchange.markets.len()
            ])

            //2. create serum market
            let serumMarketKey = await createSerumMarkets(
                context,
                perpsInstrument[0]
            );
            console.log("create serum markets successful: ", serumMarketKey)

            //3. call ix

            let serumMarket = await getSerumMarket(context, serumMarketKey)
            let newInstrumentTx = context.program.transaction.createOptifiPerpsMarket(
                optifiAssetToNumber(assetToOptifiAsset(asset)),
                {
                    accounts: {
                        optifiExchange: exchangeAddress,
                        instrument: perpsInstrument[0],
                        systemProgram: SystemProgram.programId,
                        perpAccount: perpAccount[0],
                        payer: context.provider.wallet.publicKey,
                        optifiMarket: derivedMarketAddress,
                        serumMarket: serumMarketKey,
                        longSplTokenMint: serumMarket.baseMintAddress,
                        shortSplTokenMint: anchor.web3.Keypair.generate().publicKey,
                    },
                    preInstructions: [increaseComputeUnitsIx]
                }
            )
            await signAndSendTransaction(context, newInstrumentTx)
                .then((res) => {
                    console.log(res);
                    if (res.resultType === TransactionResultType.Successful) {
                        console.log("Created new instrument -",
                            formatExplorerAddress(
                                context,
                                res.txId as string,
                                SolanaEntityType.Transaction,
                            )
                        )
                    } else {
                        console.error(res);
                        reject(res);
                    }

                })
                .catch((err) => {
                    console.error("Got error trying to sign and send chain instruction ", err);
                    reject(err);
                })
        } catch {
            (e) => {
                console.log("createPerpsInstrumentsAndMarkets err: " + e)
            }
        }
    })

}

