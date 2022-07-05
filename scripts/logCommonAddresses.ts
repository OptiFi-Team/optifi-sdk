/**
 * Derive commonly used program addresses from the current context, and log them, for debugging and info purposes
 */

import { initializeContext } from "../index";
import { findExchangeAccount, findUserAccount, userAccountExists } from "../utils/accounts";
import { formatExplorerAddress, logFormatted, SolanaEntityType } from "../utils/debug";


initializeContext().then((context) => {
    findExchangeAccount(context).then(([exchangeAddress, _]) => {
        findUserAccount(context).then(([userAccount, _]) => {
            userAccountExists(context).then(([acctExists, _]) => {
                let exchangeExists: boolean;
                context.program.account.exchange.fetch((exchangeAddress)).then((res) => {
                    exchangeExists = true;
                    console.log("usdcCentralPool: ", res.usdcCentralPool.toString());
                    console.log("usdcFeePool: ", res.usdcFeePool.toString());
                }).catch((err) => {
                    exchangeExists = false;
                }).finally(() => {
                    logFormatted({
                        'Exchange UUID': context.exchangeUUID,
                        'Exchange Address': exchangeAddress.toString(),
                        'Exchange URL': formatExplorerAddress(context, exchangeAddress.toString(), SolanaEntityType.Account),
                        'Exchange Exists': exchangeExists,
                        'User Wallet Address': context.provider.wallet.publicKey.toString(),
                        'Optifi Program ID': context.program.programId.toString(),
                        'Optifi User Account Adddress': userAccount.toString(),
                        'Optifi User Account Exists': acctExists
                    })
                })
            })
        })
    })
})
