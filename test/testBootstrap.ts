import * as assert from "assert";
import {initializeContext} from "../index";
import boostrap from "../sequences/boostrap";
import Context from "../types/context";

describe('bootstrap',  () => {
    it('Creates the optifi system',  () => {
        // @ts-ignore
        initializeContext().then((context: Context) => {
            console.log("Initialized")
            boostrap(context).then((res) => {
                console.log(res)
                assert.ok("Bootstrapped")
            }).catch((err) => {
                console.error(err);
                assert.fail("Got error");
            })
        }).catch((err) => {
            console.error(err);
            assert.fail("Got error");
        })
    })
})