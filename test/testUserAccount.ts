import {initializeContext} from "../index";
import {findUserAccount, userAccountExists} from "../utils/accounts";
import * as assert from "assert";
import initializeUserAccount from "../instructions/initializeUserAccount";
import {logUserAccount} from "../utils/debug";

describe('User Account', async () => {
    let context = await initializeContext();

    it('Can derive a user address', () => {
        assert.doesNotReject(findUserAccount(context))
    });

    it('Already exists, or initializes successfully', () => {

        console.log("Checking whether account already exists...");
        userAccountExists(context).then(([alreadyExists, acct]) => {

            if (alreadyExists) {
                console.log("Account does already exist, ", acct);
                logUserAccount(context).then(() => {
                    assert.ok("Account already exists");
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