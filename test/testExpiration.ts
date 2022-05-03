import * as assert from "assert";
import { calculateSerumMarketsCount } from "../constants";
import { generateExpirations } from "../utils/chains";

function test() {
    let markets = calculateSerumMarketsCount();
    console.log("Serum markets are", markets);
    let expirations = generateExpirations();
    console.log("Expirations are ", expirations);

}

test()