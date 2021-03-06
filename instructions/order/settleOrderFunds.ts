import InstructionResult from "../../types/instructionResult";
import { PublicKey, Transaction, TransactionSignature } from "@solana/web3.js";
import Context from "../../types/context";
import { formOrderContext } from "../../utils/orders";
import { OrderSide, UserAccount } from "../../types/optifi-exchange-types";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { increaseComputeUnitsIx, signAndSendTransaction, TransactionResultType } from "../../utils/transactions";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";

export function getSettleOrderTx(
    context: Context,
    marketAddress: PublicKey,
    userAccount: UserAccount):
    Promise<Transaction> {
    return new Promise((resolve, reject) => {
        formOrderContext(context, marketAddress, OrderSide.Bid, userAccount).then((orderContext) => {
            let tx = context.program.transaction.settleOrderFunds({
                accounts: {
                    optifiExchange: orderContext.optifiExchange,
                    userAccount: orderContext.userAccount,
                    optifiMarket: marketAddress,
                    serumMarket: orderContext.serumMarket,
                    userSerumOpenOrders: orderContext.openOrders,
                    coinVault: orderContext.coinVault,
                    pcVault: orderContext.pcVault,
                    asks: orderContext.asks,
                    bids: orderContext.bids,
                    requestQueue: orderContext.requestQueue,
                    eventQueue: orderContext.eventQueue,
                    instrumentLongSplTokenMint: orderContext.coinMint,
                    instrumentShortSplTokenMint: orderContext.instrumentShortSplTokenMint,
                    userInstrumentLongTokenVault: orderContext.userInstrumentLongTokenVault,
                    userInstrumentShortTokenVault: orderContext.userInstrumentShortTokenVault,
                    userMarginAccount: orderContext.userMarginAccount,
                    vaultSigner: orderContext.vaultSigner,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    serumDexProgramId: orderContext.serumDexProgramId
                },
                preInstructions: [increaseComputeUnitsIx]
            });
            resolve(tx);
        }).catch((err) => {
            console.error(err);
            reject(err);
        })
    })
}



export default function settleOrderFunds(context: Context,
    marketAddresses: PublicKey[], userAccount: UserAccount): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {

        let settleOrderTx = new Transaction();

        for (let marketAddress of marketAddresses) {
            settleOrderTx.add(await getSettleOrderTx(context, marketAddress, userAccount));
        };

        signAndSendTransaction(context, settleOrderTx).then(async (res) => {
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
    })
}