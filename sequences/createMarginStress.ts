import { SUPPORTED_ASSETS } from "../constants";
import marginStressInit from "../instructions/marginStressInit";
import Context from "../types/context";

/**
 * Create new instruments for an exchange
 *
 * @param context
 */
export function createMarginStress(context: Context): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            for (let asset of SUPPORTED_ASSETS) {
                marginStressInit(context, asset).then((res) => {
                    console.log("Got init res", res);
                }).catch((err) => {
                    console.error(err);
                })
            }
            resolve();
        } catch (e) {
            console.error(e);
            reject(e);
        }
    })
}