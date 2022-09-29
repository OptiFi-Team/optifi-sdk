import * as anchor from "@project-serum/anchor";
import Context from "../../types/context";
import { PublicKey, TransactionInstruction, TransactionSignature } from "@solana/web3.js";
import { OrderSide, UserAccount } from "../../types/optifi-exchange-types";
import InstructionResult from "../../types/instructionResult";
import { formCancelOrderContext } from "../../utils/orders";
import { increaseComputeUnitsIx } from "../../utils/transactions";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { findMarginStressWithAsset } from "../../utils/margin";
import marginStress from "../marginStress/marginStress";
import { findSerumAuthorityPDA } from "../../utils/pda";

// =========================================================================================
//  the cancelOrder in Optifi program is deprecated, use cancelOrderByClientOrderId instead
// =========================================================================================
// function cancelOrder(
//   context: Context,
//   marketAddress: PublicKey,
//   side: OrderSide,
//   orderId: anchor.BN
// ): Promise<InstructionResult<TransactionSignature>> {
//   return new Promise((resolve, reject) => {
//     formCancelOrderContext(context, marketAddress)
//       .then((orderContext) => {
//         let cancelTx = context.program.transaction.cancelOrder(side, orderId, {
//           accounts: orderContext,
//         });
//         signAndSendTransaction(context, cancelTx)
//           .then((cancelRes) => {
//             if (cancelRes.resultType === TransactionResultType.Successful) {
//               resolve({
//                 successful: true,
//                 data: cancelRes.txId as TransactionSignature,
//               });
//             } else {
//               console.error(cancelRes);
//               reject(cancelRes);
//             }
//           })
//           .catch((err) => reject(err));
//       })
//       .catch((err) => reject(err));
//   });
// }

export default function cancelOrderByClientOrderId(
    context: Context,
    userAccount: UserAccount,
    marketAddress: PublicKey,
    side: OrderSide,
    clientOrderId: anchor.BN
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        formCancelOrderContext(context, marketAddress, userAccount)
            .then(async ([orderContext, asset]) => {
                let ixs: TransactionInstruction[] = [increaseComputeUnitsIx];
                ixs.push(...(await marginStress(context, asset)));

                // add cancel order by client order id inx
                let cancelOrderByClientOrderIdInx = context.program.instruction.cancelOrderByClientOrderId(side, clientOrderId, {
                    accounts: orderContext,
                });
                ixs.push(cancelOrderByClientOrderIdInx);

                // add consume event inx
                let [serumMarketAuthority] = await findSerumAuthorityPDA(context);
                let consumeEventInx = await context.program.methods
                    .consumeEventQueue(5)
                    .accounts({
                        optifiExchange: orderContext.optifiExchange,
                        serumMarket: orderContext.serumMarket,
                        eventQueue: orderContext.eventQueue,
                        userSerumOpenOrders: orderContext.openOrders,
                        serumDexProgramId: orderContext.serumDexProgramId,
                        consumeEventsAuthority: serumMarketAuthority,
                    })
                    .instruction();
                ixs.push(consumeEventInx);

                // add settle order inx
                let settleOrderIx = context.program.instruction.settleOrderFunds({
                    accounts: {
                        optifiExchange: orderContext.optifiExchange,
                        userAccount: orderContext.userAccount,
                        optifiMarket: marketAddress,
                        serumMarket: orderContext.serumMarket,
                        userSerumOpenOrders: orderContext.openOrders,
                        coinVault: orderContext.coinVault,
                        pcVault: orderContext.pcVault,
                        instrumentLongSplTokenMint: orderContext.coinMint,
                        instrumentShortSplTokenMint: orderContext.instrumentShortSplTokenMint,
                        userInstrumentLongTokenVault: orderContext.userInstrumentLongTokenVault,
                        userInstrumentShortTokenVault: orderContext.userInstrumentShortTokenVault,
                        userMarginAccount: orderContext.userMarginAccount,
                        vaultSigner: orderContext.vaultSigner,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        serumDexProgramId: orderContext.serumDexProgramId,
                        feeAccount: orderContext.feeAccount,
                    },
                });

                let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, orderContext.optifiExchange, asset);

                let cancelOrderRes = await context.program.rpc.userMarginCalculate({
                    accounts: {
                        optifiExchange: orderContext.optifiExchange,
                        marginStressAccount: marginStressAddress,
                        userAccount: orderContext.userAccount,
                    },
                    instructions: ixs,
                });

                resolve({
                    successful: true,
                    data: cancelOrderRes as TransactionSignature,
                });
            })
            .catch((err) => reject(err));
    });
}
