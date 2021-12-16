import {initializeContext} from "../index";
import initialize from "../instructions/initialize";
import * as assert from "assert";
import {findExchangeAccount} from "../utils/accounts";
import {Exchange} from "../types/optifi-exchange-types";

describe('Initialization', () => {
    it('Should create a new optifi exchange account, with the user as the authority', () => {
        let context = initializeContext();
        initialize(context).then((res) => {
            console.log("Did initialize, got UUID, ", res.data);
            if (res.data) {
                findExchangeAccount(context, res.data).then((acct) => {
                    context.connection.getAccountInfo(acct[0]).then((acctInfo) => {
                        console.log("Got account info ", acctInfo?.data);
                        assert.ok("Got account info successfully")
                    }).catch((err) => {
                        console.error(err);
                        assert.fail("Couldn't retrieve exchange");
                    })
                })
            } else {
                assert.fail("Result didn't have data");
            }
        }).catch((err) => {
            assert.fail(`Got error, ${err}`);
        })
    })
})