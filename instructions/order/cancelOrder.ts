import * as anchor from "@project-serum/anchor";
import Context from "../../types/context";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, TransactionInstruction, TransactionSignature } from "@solana/web3.js";
import { OrderSide, UserAccount } from "../../types/optifi-exchange-types";
import InstructionResult from "../../types/instructionResult";
import { formCancelOrderContext } from "../../utils/orders";
import {
  increaseComputeUnitsIx,
  signAndSendTransaction,
  TransactionResultType,
} from "../../utils/transactions";
import { DexInstructions } from '@project-serum/serum';
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { findMarginStressWithAsset } from "../../utils/margin";
import marginStress from "../marginStress";
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

        let ixs: TransactionInstruction[] = [increaseComputeUnitsIx]
        ixs.push(...await marginStress(context, asset));

        let cancelOrderByClientOrderIdInx = context.program.instruction.cancelOrderByClientOrderId(
          side,
          clientOrderId,
          {
            accounts: orderContext,
          }
        );
        ixs.push(cancelOrderByClientOrderIdInx)

        // let consumeEventInx = DexInstructions.consumeEvents({
        //   market: orderContext.serumMarket,
        //   openOrdersAccounts: [orderContext.openOrders],
        //   eventQueue: orderContext.eventQueue,
        //   pcFee: orderContext.userMarginAccount,
        //   coinFee: orderContext.userInstrumentLongTokenVault,
        //   limit: 65535,
        //   programId: orderContext.serumDexProgramId,
        // })
        // ixs.push(consumeEventInx)

        let [serumMarketAuthority,] = await findSerumAuthorityPDA(context)

        let settleOrderIx = context.program.instruction.settleOrderFunds({
          accounts: {
            optifiExchange: orderContext.optifiExchange,
            userAccount: orderContext.userAccount,
            optifiMarket: marketAddress,
            serumMarket: orderContext.serumMarket,
            userSerumOpenOrders: orderContext.openOrders,
            coinVault: orderContext.coinVault,
            pcVault: orderContext.pcVault,
            // asks: orderContext.asks,
            // bids: orderContext.bids,
            // requestQueue: orderContext.requestQueue,
            eventQueue: orderContext.eventQueue,
            instrumentLongSplTokenMint: orderContext.coinMint,
            instrumentShortSplTokenMint: orderContext.instrumentShortSplTokenMint,
            userInstrumentLongTokenVault: orderContext.userInstrumentLongTokenVault,
            userInstrumentShortTokenVault: orderContext.userInstrumentShortTokenVault,
            userMarginAccount: orderContext.userMarginAccount,
            vaultSigner: orderContext.vaultSigner,
            tokenProgram: TOKEN_PROGRAM_ID,
            serumDexProgramId: orderContext.serumDexProgramId,
            feeAccount: orderContext.feeAccount,
            consumeEventsAuthority: serumMarketAuthority
          },
        });

        ixs.push(settleOrderIx);

        let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, orderContext.optifiExchange, asset);

        let cancelOrderRes = await context.program.rpc.userMarginCalculate({
          accounts: {
            optifiExchange: orderContext.optifiExchange,
            marginStressAccount: marginStressAddress,
            userAccount: orderContext.userAccount,
          },
          instructions: ixs
        });

        resolve({
          successful: true,
          data: cancelOrderRes as TransactionSignature
        })
      })
      .catch((err) => reject(err));
  });
}