import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {PublicKey, TransactionSignature} from "@solana/web3.js";
import {findExchangeAccount} from "../utils/accounts";

export default function syncPositions(context: Context,
                                      instrumentAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findIn
        }).catch((err) => reject(err))
    })
}