import {findOptifiExchange} from "../utils/accounts";
import {initializeContext} from "../index";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";
import * as assert from "assert";

describe('Validate constant exchange ID exists', () => {
    let context = initializeContext();

    it('Can be found on chain', () => {
        findOptifiExchange(context).then(([address, bump]) => {
            let optifiExchangeUrl = formatExplorerAddress(context, address.toString(), SolanaEntityType.Account)
            //console.log("Looking for exchange at ", optifiExchangeUrl);
            context.program.account.exchange.fetch(address).then((res) => {
                //console.log("Got res ", res);
                assert.ok("Found exchange");
            }).catch((err) => {
                console.error(err);
                assert.fail("Couldn't get account");
            })
        });
    })
})