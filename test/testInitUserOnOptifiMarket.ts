import {initializeContext} from "../index";
import {findUserAccount, userAccountExists} from "../utils/accounts";
import * as assert from "assert";
import * as anchor from "@project-serum/anchor";
import initUserOnOptifiMarket from "../instructions/initUserOnOptifiMarket";

describe('Initialize a new open orders account', () => {
    initializeContext().then((context) => {
        it('Can derive a user address', () => {
            assert.doesNotReject(findUserAccount(context))
        });
    })

    /*
    it('Initialize a new open orders account', () => {
        console.log("Trying to initialize a new open orders account");
        initUserOnOptifiMarket(context, ).then((tx: any) => {
            console.log('Open orders account initialized', tx)
            assert.ok("Finished withdraw");
        }).catch((err) => {
            console.log('error trying to initialize')
            console.log(err)
            assert.fail("Couldn't inialize");
        });

    })
     */
})