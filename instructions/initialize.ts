import Context from "../types/context";
import InstructionResult from "../types/instructionResult";

/**
 * Executes the on chain "initialize" instruction, which doesn't serve any functionality, but is useful to
 * validate that everything is online and working
 *
 * @param context The program context
 */
export default function initialize(context: Context): Promise<InstructionResult<string>> {
    return new Promise((resolve, reject) => {
        context.program.rpc.initialize({
            accounts: {},
            signers: [
                context.user
            ]
        }).then((res) => {
            resolve(
                {
                    successful: true,
                    data: res
                }
            )
        }).catch((err) => {
            console.error("Got error while trying to execute initialize instruction ", err);
            reject({
                successful: false,
                error: err
            } as InstructionResult<any>);
        })
    });
}