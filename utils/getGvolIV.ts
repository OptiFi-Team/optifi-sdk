import Asset from "../types/asset";
import { getGvolAtm7 } from "./getGvolAtm7";
import { getGvolTermStructure } from "./getGvolTermStructure";


// expiryDate = marginStressAccount.expiryDate[0] * 1000
export async function getGvolIV(asset: Asset, expiryDate: number) {

    let termStructure = (await getGvolTermStructure(asset));
    if (!termStructure) {
        console.log("can't get getGvolTermStructure data for asset" + asset)
        return [null, Math.floor(Date.now() / 1000)]
    }
    let iv;
    let now;
    let method;

    termStructure.forEach(async element => {
        if (element.expiration == expiryDate) {
            iv = element.markIv
            now = Math.floor(Date.now() / 1000);
        }
        method = 1;
    });

    // Second source
    if (iv == null) {
        let _iv = await getGvolAtm7(asset);
        iv = _iv.atm7;
        now = _iv.date / 1000;
        method = 2;
    }

    // Third source
    if (iv == null) {
        iv = (termStructure[0]) ? termStructure[0].markIv : -1
        now = Math.floor(Date.now() / 1000);
        method = 3;
    }

    console.log("Asset: ", asset, ", method: ", method, ", iv: ", iv, ", now: ", now);

    return [iv, now];
}

// getGvolIV(Asset.Bitcoin, 0);
