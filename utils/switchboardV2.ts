import { PublicKey } from "@solana/web3.js";
import SwitchboardProgram from "@switchboard-xyz/sbv2-lite";
import { SolanaEndpoint } from "../constants";
import Context from "../types/context";


export async function getSwitchboard(context: Context, switchboardFeed: PublicKey): Promise<number> {
    // load the switchboard program
    let sbv2;

    switch (context.endpoint) {
        case SolanaEndpoint.Devnet:
            sbv2 = await SwitchboardProgram.loadDevnet();
            break
        case SolanaEndpoint.Mainnet:
            sbv2 = await SwitchboardProgram.loadMainnet();
            break
    };

    const accountInfo = await sbv2.program.provider.connection.getAccountInfo(
        switchboardFeed
    );
    if (!accountInfo) {
        throw new Error(`failed to fetch account info`);
    }

    // Get latest value if its been updated in the last 300 seconds
    const latestResult = sbv2.decodeLatestAggregatorValue(accountInfo, 300);
    if (latestResult === null) {
        throw new Error(`failed to fetch latest result for aggregator`);
    }
    console.log(`latestResult: ${latestResult}`);
    // latestResult: 105.673205

    return latestResult;
}