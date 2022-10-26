import Context from "../types/context";
import { PublicKey, TransactionSignature, SystemProgram } from "@solana/web3.js";
import { Duration } from "../types/optifi-exchange-types";
import { createSerumMarkets, createSerumMarketsWithAsset } from "../sequences/boostrap";
import Asset from "../types/asset";
import { findExchangeAccount } from "../utils/accounts";
import {
    assetToOptifiAsset,
    optifiAssetToNumber,
} from "../utils/generic";
import * as anchor from "@project-serum/anchor";
import { increaseComputeUnitsIx, signAndSendTransaction, TransactionResultType } from "../utils/transactions";
import { formatExplorerAddress, SolanaEntityType } from "../utils/debug";
import { getSerumMarket } from "../utils/serum";
import { findPerpsInstrument, findPerpAccount, findPerpsMarket } from "../utils/accounts"

/**
 * Create new perps instruments for an exchange
 *
 * @param context
 */
export async function createPerpsInstrumentsAndMarkets(context: Context, asset: Asset): Promise<string> {
    return new Promise(async (resolve, reject) => {
        try {
            //1. prepare instrument data
            let [exchangeAddress,] = await findExchangeAccount(context)
            // console.log("exchangeAddress: " + exchangeAddress)

            let [perpsInstrument,] = await findPerpsInstrument(
                context,
                asset,
                exchangeAddress,
            )
            // console.log("perpsInstrument address: " + perpsInstrument)
            let [perpAccount,] = await findPerpAccount(
                context,
                asset,
                exchangeAddress,
            )
            // console.log("perpAccount address: " + perpAccount)
            let [derivedMarketAddress,] = await findPerpsMarket(
                context,
                asset,
                exchangeAddress,
            )
            // console.log("optifi market address: " + derivedMarketAddress)

            //2. create serum market
            let serumMarketKey = await createSerumMarketsWithAsset(
                context,
                asset,
            );
            console.log("create serum markets successful: ", serumMarketKey.toString())

            //3. call ix
            let serumMarket = await getSerumMarket(context, serumMarketKey)

            // let account = {
            //     optifiExchange: exchangeAddress,
            //     instrument: perpsInstrument[0],
            //     systemProgram: SystemProgram.programId,
            //     perpAccount: perpAccount[0],
            //     payer: context.provider.wallet.publicKey,
            //     optifiMarket: derivedMarketAddress[0],
            //     serumMarket: serumMarketKey,
            //     longSplTokenMint: serumMarket.baseMintAddress,
            //     shortSplTokenMint: anchor.web3.Keypair.generate().publicKey,
            // }

            let newInstrumentTx = context.program.transaction.createOptifiPerpsMarket(
                optifiAssetToNumber(assetToOptifiAsset(asset)),
                {
                    accounts: {
                        optifiExchange: exchangeAddress,
                        instrument: perpsInstrument[0],
                        systemProgram: SystemProgram.programId,
                        perpAccount: perpAccount[0],
                        payer: context.provider.wallet.publicKey,
                        optifiMarket: derivedMarketAddress[0],
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
                    if (res.txId && res.resultType === TransactionResultType.Successful) {
                        console.log("Created new perps instrument -",
                            formatExplorerAddress(
                                context,
                                res.txId as string,
                                SolanaEntityType.Transaction,
                            )
                        )
                        resolve(res.txId)
                    } else {
                        console.error(res);
                        reject(res);
                    }

                })
                .catch((err) => {
                    console.error("Got error trying to sign and send chain instruction ", err);
                    reject(err);
                })
        } catch (e) {
            console.log("createPerpsInstrumentsAndMarkets err: " + e);
            reject(e)
        }

    })

}

