import * as anchor from "@project-serum/anchor";
import Context from "../types/context";
import {PublicKey, TransactionSignature} from "@solana/web3.js";
import {findExchangeAccount, findUserAccount} from "../utils/accounts";
import {Amm} from "../types/optifi-exchange-types";
import {SERUM_MARKETS} from "../constants";

export function ammDeposit(context: Context,
                           ammAddress: PublicKey,
                           amount: number): Promise<TransactionSignature> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findUserAccount(context).then(([userAccountAddress, _]) => {
                context.program.account.amm.fetch(ammAddress).then((ammRes) => {
                    // @ts-ignore
                    let amm = ammRes as Amm;
                    let ammDepositTx = context.program.transaction.ammDeposit(
                        new anchor.BN(amount),
                        {
                            accounts: {
                                optifiExchange: exchangeAddress,
                                userAccount: userACcountAddress,
                                ammQuoteTokenVault: ammRes.quoteTokenVault,
                            }
                        }
                    )
                })
            })
        })
    })
}