import Context from "../types/context";
import {PublicKey, TransactionSignature} from "@solana/web3.js";
import {findExchangeAccount, findUserAccount} from "../utils/accounts";
import {Amm} from "../types/optifi-exchange-types";

export function ammDeposit(context: Context,
                           ammAddress: PublicKey): Promise<TransactionSignature> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findUserAccount(context).then(([userAccountAddress, _]) => {
                context.program.account.amm.fetch(ammAddress).then((ammRes) => {
                    // @ts-ignore
                    let amm = ammRes as Amm;
                    let ammDepositTx = context.program.transaction.ammDeposit()
                })
            })
        })
    })
}