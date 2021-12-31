import Context from "../types/context";
import {TransactionSignature} from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";

export function placeOrder(context: Context): Promise<InstructionResult<TransactionSignature> {
    return new Promise((resolve, reject) => {
        
    })
}