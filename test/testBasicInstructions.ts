import {initializeContext} from "../index";
import initialize from "../instructions/initialize";
import * as assert from "assert";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";

describe('Basic Initialize Instruction', () => {
    it('Should succeed in running a basic transaction', () => {
        let context = initializeContext();
        initialize(context).then((res) => {
            console.log("Got transaction signature ", res.data);
            let txUrl = formatExplorerAddress(context, res.data as string, SolanaEntityType.Transaction);
            console.log("Tx URL is", txUrl);
            assert.ok("Transaction succeeded");
        }).catch((err) => {
            assert.fail(`Got error, ${err}`);
        })
    })
})