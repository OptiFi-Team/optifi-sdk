import {PublicKey} from "@solana/web3.js";
import Context from "../types/context";
import {Market} from "../types/optifi-exchange-types";
import InstructionResult from "../types/instructionResult";
import * as anchor from "@project-serum/anchor";

/**
 * Initialize a new serum market
 *
 * @param context Program context
 * @param authority The public key of the account that should be marked as the market authority
 */
export default function initializeMarket(context: Context,
                                         authority: PublicKey): Promise<InstructionResult<Market>> {


    return new Promise((resolve, reject) => {
        // Constants
        let coinLotSize = new anchor.BN(1000);
        let pcLotSize = new anchor.BN(1);
        let vaultSignerNonce = new anchor.BN(0);
        let pcDustThreshold = new anchor.BN(5);

        // New market accounts
        let bidsAcct = anchor.web3.Keypair.generate();
        let asksAcct = anchor.web3.Keypair.generate();
        let requestQueueAcct = anchor.web3.Keypair.generate();
        let eventQueueAcct = anchor.web3.Keypair.generate();

        context.program.rpc.initializeMarket(
            authority,
            authority,
            coinLotSize,
            pcLotSize,
            vaultSignerNonce,
            pcDustThreshold,
            {
                // TODO: sync with prince about latest account info
                accounts: {},
                signers: [
                    context.user,
                    bidsAcct,
                    asksAcct,
                    requestQueueAcct,
                    eventQueueAcct
                ],
                instructions: []
            }
        )
    });
}
