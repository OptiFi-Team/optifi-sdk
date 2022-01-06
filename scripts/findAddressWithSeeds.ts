/**
 * Stub for quickly checking program addresses for different seeds
 */

import {initializeContext} from "../lib";
import {findAccountWithSeeds, findExchangeAccount, findInstrument} from "../utils/accounts";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";
import Context from "../types/context";
import {Asset, ExpiryType, InstrumentType} from "../types/optifi-exchange-types";
import {INSTRUMENT_PREFIX} from "../constants";


function getSeeds(context: Context): Promise<any[]> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            resolve([
                Buffer.from(INSTRUMENT_PREFIX),
                exchangeAddress.toBuffer(),
                Buffer.from('11116419960008')
            ])
        })
    })
}


let entityType = SolanaEntityType.Account;

initializeContext().then((context: Context) => {
    getSeeds(context).then((seeds) => {
        console.log("Seeds are ", seeds);
        findAccountWithSeeds(context, seeds).then(([address, bump]) => {
            let acctUrl = formatExplorerAddress(context, address.toString(), entityType)
            console.log(`Address: ${address.toString()}\nBump: ${bump}\nExplorer: ${acctUrl}`);
        }).catch((err) => {
            console.error(err)
        })
    })

})