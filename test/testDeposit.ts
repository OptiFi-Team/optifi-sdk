import {initializeContext} from "../index";
import {findUserAccount, userAccountExists} from "../utils/accounts";
import * as assert from "assert";
import * as anchor from "@project-serum/anchor";
import initializeUserAccount from "../instructions/initializeUserAccount";
import {logUserAccount} from "../utils/debug";
import deposit from "../instructions/deposit";

describe('Deposit', () => {
    let context = initializeContext();

    it('Deposit', () => {
        deposit(context, new anchor.BN(1), context.user.publicKey).then((tx: any) => {
            console.log('Deposit made', tx)
            assert.ok("Finished deposit");
        }).catch((err) => {
            console.log('error trying to deposit')
            console.log(err)
            assert.fail("Couldn't deposit")
        });
        console.log("After deposity")
    });

    it('Can derive a user address', () => {
        assert.doesNotReject(findUserAccount(context))
    });


})