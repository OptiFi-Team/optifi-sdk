import { PublicKey } from "@solana/web3.js";
import { AggregatorAccount, loadSwitchboardProgram } from "@switchboard-xyz/switchboard-v2";
import { resolve } from "path";
import { SolanaEndpoint } from "../constants";
import Context from "../types/context";


export async function getSwitchboard(context: Context, switchboardFeed: PublicKey): Promise<number> {
    // load the switchboard program
    let cluster;

    switch (context.endpoint) {
        case SolanaEndpoint.Devnet:
            cluster = "devnet";
            break
        case SolanaEndpoint.Mainnet:
            cluster = "mainnet-beta";
            break
    };

    const program = await loadSwitchboardProgram(
        cluster,
        context.connection,
        // Keypair.fromSeed(new Uint8Array(32).fill(1)) // using dummy keypair since we wont be submitting any transactions
    );

    // load the switchboard aggregator
    const aggregator = new AggregatorAccount({
        program,
        publicKey: switchboardFeed,
    });

    // get the result
    const result = await aggregator.getLatestValue();
    console.log(`Switchboard Result: ${result.toNumber()}`);

    return result.toNumber();
}