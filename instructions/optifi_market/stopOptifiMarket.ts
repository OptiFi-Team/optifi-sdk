import Context from "../../types/context";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../../types/instructionResult";
import { findExchangeAccount } from "../../utils/accounts";
import { OptifiMarket } from "../../types/optifi-exchange-types";

export function stopOptifiMarket(context: Context, marketAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.optifiMarket.fetch(marketAddress).then((marketRes) => {
                let optifiMarket = marketRes as OptifiMarket;
                let stopTx = context.program.rpc.stopOptifiMarket(
                    {
                        accounts: {
                            optifiExchange: exchangeAddress,
                            optifiMarket: marketAddress,
                            instrumentLongSplToken: optifiMarket.instrumentLongSplToken,
                            instrumentShortSplToken: optifiMarket.instrumentShortSplToken,
                        }
                    }
                )
                stopTx.then((res) => {
                    resolve({
                        successful: true,
                        data: res as TransactionSignature
                    })
                }).catch((err) => reject(err));
            }).catch((err) => reject(err));
        }).catch((err) => reject(err));
    })
}