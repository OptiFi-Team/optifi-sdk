import Context from "../types/context";
import {PublicKey, TransactionSignature} from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";
import {findOptifiMarkets} from "../utils/market";
import {SERUM_MARKETS} from "../constants";
import {createNextOptifiMarket} from "../instructions/createOptifiMarket";

export default function createOptifiMarkets(context: Context,
                                            initialInstruments: PublicKey[]): Promise<InstructionResult<void>[]> {
    return new Promise((resolve, reject) => {
        console.debug("Finding existing markets");
        findOptifiMarkets(context).then((markets) => {
            let marketLen = markets.length;
            console.debug(`Found ${marketLen} markets already existing`);
            // Check if there are more to create
            if (marketLen < SERUM_MARKETS) {
                let marketsToCreate = SERUM_MARKETS - marketLen;
                console.debug(`Creating ${marketsToCreate} markets`);
                for (let i = 0; i < marketsToCreate; i++) {
                    // Send the instruction to create each market,
                    // derive the instrument address
                    // TODO: create a new AMM for each new market that we need to create
                }
            } else {
                console.debug("All markets already created", markets);
                resolve([
                    {
                        successful: true
                    }
                ])
            }
        }).catch((err) => reject(err));
    })
}