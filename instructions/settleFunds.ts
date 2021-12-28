import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {PublicKey} from "@solana/web3.js";
import {findExchangeAccount} from "../utils/accounts";


export default function settleFunds(context: Context,
                                    userToSettle: PublicKey): Promise<InstructionResult<string>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {

        })
    })
}