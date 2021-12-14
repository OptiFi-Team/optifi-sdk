import {initializeContext} from "../index";
import initialize from "../instructions/initialize";
import * as assert from "assert";

describe('Basic Initialize Instruction', () => {
    it('Should succeed in running a basic transaction', () => {
        let context = initializeContext();
        initialize(context).then(() => {
            assert.ok("Transaction succeeded");
        }).catch((err) => {
            assert.fail(`Got error, ${err}`);
        })
    })
})