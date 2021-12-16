import {initializeContext} from "../index";
import {findUserAccount, userAccountExists} from "../utils/accounts";
import * as assert from "assert";
import * as anchor from "@project-serum/anchor";
import withdraw from "../instructions/withdraw";

describe('Withdraw', () => {
    let context = initializeContext();

    it('Can derive a user address', () => {
        assert.doesNotReject(findUserAccount(context))
    });

    it('Withdraw', () => {
        console.log("Trying withdraw");
        withdraw(context, new anchor.BN(1), context.user.publicKey).then((tx: any) => {
            console.log('Withdraw made', tx)
            assert.ok("Finished withdraw");
        }).catch((err) => {
            console.log('error trying to withdraw')
            console.log(err)
            assert.fail("Couldn't withdraw");
        });

    })
})