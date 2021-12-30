import * as assert from "assert";
import {calculateSerumMarketsCount} from "../constants";
import {generateExpirations} from "../utils/chains";

describe('Expirations', () => {
    it('Properly calculates expirations', () => {
        let markets = calculateSerumMarketsCount();
        console.log("Serum markets are", markets);
        let expirations = generateExpirations();
        console.log("Expirations are ", expirations);
    })
})