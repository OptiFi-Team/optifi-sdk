import {initializeContext} from "../index";
import {findUserAccount, userAccountExists} from "../utils/accounts";
import * as assert from "assert";
import * as anchor from "@project-serum/anchor";
import initializeUserAccount from "../instructions/initializeUserAccount";
import {logUserAccount} from "../utils/debug";
import deposit from "../instructions/deposit";

describe('Deposit', () => {
    let context = initializeContext();

    it('Can derive a user address', () => {
        assert.doesNotReject(findUserAccount(context))
    });

    it('Already exists, or initializes successfully', () => {

        console.log("Checking whether account already exists...");
        userAccountExists(context).then(([alreadyExists, acct]) => {

            if (alreadyExists) {
                console.log("Account does already exist, ", acct);
                it('Deposit', () => {
                    deposit(context, new anchor.BN(1), acct).then((tx: any) => {
                        console.log('Deposit made', tx)
                    }).catch((err) => {
                        console.log('error trying to deposit')
                        console.log(err)
                    })
                })
            } else {
                console.log("Account does not already exist, creating... ");
                initializeUserAccount(context).then((res) => {
                    console.log("Created account")
                    assert.strictEqual(res.successful, true);
                    assert.notStrictEqual(res.data, undefined);
                    console.log("Created account ", res.data);
                    logUserAccount(context).then(() => {
                        assert.ok("Successfully created account")
                    })
                }).catch((err) => {
                    console.error("Didn't create account");
                    console.error(err);
                    assert.fail("Did not create account successfully");
                });
            }
        })
    })
})