import Context from "../../types/context";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../../types/instructionResult";
import { findExchangeAccount } from "../../utils/accounts";
import { increaseComputeUnitsIx } from "../../utils/transactions";
import { OptifiMarket } from "../../types/optifi-exchange-types";

export function updateOptifiMarket(context: Context,
    marketAddress: PublicKey,
    newInstrument: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.optifiMarket.fetch(marketAddress).then((marketRes) => {
                let optifiMarket = marketRes as OptifiMarket;

                let updateTx = context.program.rpc.updateOptifiMarket(
                    {
                        accounts: {
                            exchange: exchangeAddress,
                            optifiMarket: marketAddress,
                            instrument: newInstrument,
                            instrumentLongSplToken: optifiMarket.instrumentLongSplToken,
                            clock: SYSVAR_CLOCK_PUBKEY
                        },
                        preInstructions: [increaseComputeUnitsIx]
                    }
                )
                updateTx.then((res) => {
                    resolve({
                        successful: true,
                        data: res as TransactionSignature
                    })
                }).catch((err) => reject(err));
            }).catch((err) => reject(err));
        }).catch((err) => reject(err));
    })
}