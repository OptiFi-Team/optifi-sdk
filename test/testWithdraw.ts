import {initializeContext} from "../index";
import {findUserAccount, userAccountExists} from "../utils/accounts";
import * as assert from "assert";
import * as anchor from "@project-serum/anchor";
import withdraw from "../instructions/withdraw";

describe('Withdraw', () => {
    let context = initializeContext();

    it('Can derive a user address', async () => {
        assert.doesNotReject(findUserAccount(await context))
    });

    it('Withdraw', async () => {
        console.log("Trying withdraw");
        withdraw(await context, new anchor.BN(1)).then((tx: any) => {
            console.log('Withdraw made', tx)
            assert.ok("Finished withdraw");
        }).catch((err) => {
            console.log('error trying to withdraw')
            console.log(err)
            assert.fail("Couldn't withdraw");
        });

    })
})