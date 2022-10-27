import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount } from "../../utils/accounts";
import { increaseComputeUnitsIx } from "../../utils/transactions";
import { findAMMWithIdx } from "../../utils/amm";

export default function upgradeAmm(context: Context, ammIndex: number): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        let [optifiExchangeAddress] = await findExchangeAccount(context)
        let [ammAddress, _bump2] = await findAMMWithIdx(context, optifiExchangeAddress, ammIndex)
        context.program.rpc.upgradeAmm(
            {
                accounts: {
                    optifiExchange: optifiExchangeAddress,
                    amm: ammAddress,
                    exchangeAuthority: context.provider.wallet.publicKey
                },
                preInstructions: [increaseComputeUnitsIx]
            }
        ).then((res) => {
            resolve({
                successful: true,
                data: res as TransactionSignature
            })
        }).catch((err) => reject(err))
    })
}