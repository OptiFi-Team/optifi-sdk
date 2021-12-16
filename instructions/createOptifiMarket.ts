import Context from "../types/context";
import {OptifiMarket} from "../types/optifi-exchange-types";
import InstructionResult from "../types/instructionResult";

export default function createOptifiMarket(context: Context): Promise<InstructionResult<OptifiMarket>> {
    return new Promise((resolve, reject) => {
        context.program.rpc.createOptifiMarket(
            0,
            {
                accounts: {
                    optifi
                }
            }
        )
    })
}