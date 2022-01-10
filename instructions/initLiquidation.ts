import Context from "../types/context";
import {PublicKey, TransactionSignature} from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";
import {findLiquidationState} from "../utils/accounts";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";

export default function initLiquidation(context: Context, userToLiquidate: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findLiquidationState(context, userToLiquidate).then(([liquidationStateAddress, _]) => {
            let initLiquidateTx = context.program.transaction.initLiquidation({
                accounts: {
                    userAccount: userToLiquidate,
                    liquidationState: liquidationStateAddress
                }
            });
            signAndSendTransaction(context, initLiquidateTx).then((res) => {
                if (res.resultType === TransactionResultType.Successful) {
                    resolve({
                        successful: true,
                        data: res.txId as TransactionSignature
                    })
                } else {
                    console.error(res);
                    reject(res);
                }
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}