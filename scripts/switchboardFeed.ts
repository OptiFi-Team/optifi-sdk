/* eslint-disable unicorn/no-process-exit */
import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "..";
import { SWITCHBOARD } from "../constants";
import { getSwitchboard } from "../utils/switchboardV2";


// SOL/USD Feed https://switchboard.xyz/explorer/2/GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR
// Create your own feed here https://publish.switchboard.xyz/
// const switchboardFeed = new PublicKey(
//     "8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee"
// );

initializeContext().then((context) => {

    const switchboardFeed = new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD)

    getSwitchboard(context, switchboardFeed).then(
        () => process.exit(),
        (error) => {
            console.error("Failed to parse Switchboard Feed");
            console.error(error);
            process.exit(-1);
        }
    );
});