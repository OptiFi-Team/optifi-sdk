import {initializeContext} from "../lib";
import {signAndSendTransaction} from "../utils/transactions";
import Context from "../types/context";
import * as assert from "assert";

describe('Ping', () => {
    it('Works', () => {
        // @ts-ignore
        initializeContext().then((context: Context) => {
            console.log("Initialized context!")
            context.program.rpc.ping({}).then((res) => {
                console.log(res);
                assert.ok("pinged");
            }).catch((err) => {
                console.error(err);
                assert.fail("did not ping")
            })
        })
    })
})