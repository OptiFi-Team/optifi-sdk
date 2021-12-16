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

    it('Deposit', () => {
        deposit(context, new anchor.BN(1), context.user.publicKey).then((tx: any) => {
            console.log('Deposit made', tx)
        }).catch((err) => {
            console.log('error trying to deposit')
            console.log(err)
        })
    })
})