import Context from "../types/context";
import { TransactionSignature } from "@solana/web3.js";
import { SUPPORTED_ASSETS, SUPPORTED_DURATION, USDC_DECIMALS } from "../constants";
import { initializeAmm } from "../instructions/initializeAmm";
import { formatExplorerAddress, SolanaEntityType } from "../utils/debug";

export default function createAMMAccounts(context: Context): Promise<TransactionSignature[]> {
    return new Promise(async (resolve, reject) => {
        let txSigs: TransactionSignature[] = [];
        try {
            for (let i = 1; i <= SUPPORTED_ASSETS.length; i++) {
                for (let j = 1; j <= SUPPORTED_DURATION.length; j++) {
                    let asset = SUPPORTED_ASSETS[i - 1];
                    let duration = SUPPORTED_DURATION[i - 1];
                    let contractSize = 0.01 * 10 ** USDC_DECIMALS;
                    console.log(`Creating AMM with IDX ${i}, asset `, asset);
                    let ammRes = await initializeAmm(context, asset, i, duration, contractSize);
                    if (ammRes.successful) {
                        console.log("Successfully initialized AMM!", formatExplorerAddress(
                            context, ammRes.data as string, SolanaEntityType.Transaction
                        ));
                        txSigs.push(ammRes.data as TransactionSignature);
                    } else {
                        console.error(ammRes);
                        reject(ammRes);
                    }
                    resolve(txSigs);
                }
            }
        } catch (e) {
            console.error(e);
            reject(e);
        }
    })
}