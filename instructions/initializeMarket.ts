import {PublicKey} from "@solana/web3.js";
import Context from "../types/context";
import {Market} from "../types/optifi-exchange-types";
import InstructionResult from "../types/instructionResult";

export default function initializeMarket(context: Context,
                                         authority: PublicKey): Promise<InstructionResult<Market>> {
    return new Promise((resolve, reject) => {

    });
}
