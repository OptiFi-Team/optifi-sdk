import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {PublicKey, TransactionSignature} from "@solana/web3.js";
import {findExchangeAccount} from "../utils/accounts";
import {OptifiMarket} from "../types/optifi-exchange-types";

export default function syncPositions(context: Context,
                                      marketAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.market.fetch(marketAddress)
                .then((marketRes) => {
                    let optifiMarket = marketRes as OptifiMarket;
                    
                })
                .catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}