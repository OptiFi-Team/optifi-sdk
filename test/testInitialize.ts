import {initializeContext} from "../index";
import initialize from "../instructions/initialize";
import * as assert from "assert";

describe('Initialization', () => {
    it('Should create a new optifi exchange account, with the user as the authority', () => {
        let context = initializeContext();
        initialize(context).then((res) => {
            console.log("Did initialize");
            if (res.data) {
                assert.strictEqual(res.data.exchangeAuthority, context.user.publicKey);
            } else {
                assert.fail("Result didn't have data");
            }
        }).catch((err) => {
            assert.fail(`Got error, ${err}`);
        })
    })
})