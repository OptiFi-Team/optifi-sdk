import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, TransactionSignature } from "@solana/web3.js";
import { findOptifiExchange } from "../utils/accounts";
export default function removeInstrumentFromAmm(context: Context,
    ammAddress: PublicKey,
    instrumentAddress: PublicKey,): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findOptifiExchange(context).then(([exchangeAddress, _]) => {
            let removeMarketTx = context.program.rpc.ammRemoveInstrument({
                accounts: {
                    optifiExchange: exchangeAddress,
                    amm: ammAddress,
                    instrument: instrumentAddress,
                    clock: SYSVAR_CLOCK_PUBKEY
                }
            });
            removeMarketTx.then((removeMarketRes) => {
                resolve({
                    successful: true,
                    data: removeMarketRes as TransactionSignature

                })
            }).catch((err) => {
                console.error(err);
                reject(err);
            })
        }).catch((err) => {
            console.error(err);
            reject(err);
        })
    })
}