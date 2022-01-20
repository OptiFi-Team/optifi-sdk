import InstructionResult from "../types/instructionResult";
import {PublicKey, TransactionSignature} from "@solana/web3.js";
import Context from "../types/context";
import {formOrderContext} from "../utils/orders";
import {OrderSide} from "../types/optifi-exchange-types";
import {TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";

export default function settleOrderFunds(context: Context,
                                         marketAddress: PublicKey,): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        formOrderContext(context, marketAddress, OrderSide.Bid).then((orderContext) => {
            let settleOrderTx = context.program.transaction.settleOrderFunds({
                accounts: {
                    optifiExchange: orderContext.exchange,
                    userAccount: orderContext.userAccount,
                    optifiMarket: marketAddress,
                    serumMarket: orderContext.serumMarket,
                    userSerumOpenOrders: orderContext.openOrders,
                    coinVault: orderContext.coinVault,
                    pcVault: orderContext.pcVault,
                    userInstrumentLongTokenVault: orderContext.userInstrumentLongTokenVault,
                    userMarginAccount: orderContext.userMarginAccount,
                    vaultSigner: orderContext.vaultSigner,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    serumDexProgramId: orderContext.serumDexProgramId
                }
            });
            signAndSendTransaction(context, settleOrderTx).then((res) => {
                if (res.resultType === TransactionResultType.Successful) {
                    console.debug("Settled order funds", formatExplorerAddress(
                        context,
                        res.txId as string,
                        SolanaEntityType.Transaction
                    ))
                    resolve({
                        successful: true,
                        data: res.txId as TransactionSignature
                    })
                } else {
                    console.error(res);
                    reject(res);
                }
            }).catch((err) => {
                console.error(err);
                reject(err);
            })
        }).catch((err) => reject(err))
    })
}