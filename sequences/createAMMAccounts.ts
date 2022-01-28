import Context from "../types/context";
import {TransactionSignature} from "@solana/web3.js";
import {SUPPORTED_ASSETS} from "../constants";
import {initializeAmm} from "../instructions/initializeAmm";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";

export default function createAMMAccounts(context: Context): Promise<TransactionSignature[]> {
    return new Promise(async (resolve, reject) => {
        let txSigs: TransactionSignature[] = [];
        try {
            for (let i = 1; i<=SUPPORTED_ASSETS.length; i++) {
                let asset = SUPPORTED_ASSETS[i-1];
                console.log(`Creating AMM with IDX ${i}, asset `, asset);
                let ammRes = await initializeAmm(context, asset, i);
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
        } catch (e) {
            console.error(e);
            reject(e);
        }
    })
}