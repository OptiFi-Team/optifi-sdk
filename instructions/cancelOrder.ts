import * as anchor from "@project-serum/anchor";
import Context from "../types/context";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { OrderSide } from "../types/optifi-exchange-types";
import InstructionResult from "../types/instructionResult";
import { formCancelOrderContext } from "../utils/orders";
import {
  signAndSendTransaction,
  TransactionResultType,
} from "../utils/transactions";

function cancelOrder(
  context: Context,
  marketAddress: PublicKey,
  side: OrderSide,
  orderId: anchor.BN
): Promise<InstructionResult<TransactionSignature>> {
  return new Promise((resolve, reject) => {
    formCancelOrderContext(context, marketAddress)
      .then((orderContext) => {
        let cancelTx = context.program.transaction.cancelOrder(side, orderId, {
          accounts: orderContext,
        });
        signAndSendTransaction(context, cancelTx)
          .then((cancelRes) => {
            if (cancelRes.resultType === TransactionResultType.Successful) {
              resolve({
                successful: true,
                data: cancelRes.txId as TransactionSignature,
              });
            } else {
              console.error(cancelRes);
              reject(cancelRes);
            }
          })
          .catch((err) => reject(err));
      })
      .catch((err) => reject(err));
  });
}

export default  function cancelOrderByClientOrderId(
  context: Context,
  marketAddress: PublicKey,
  side: OrderSide,
  clientOrderId: anchor.BN
): Promise<InstructionResult<TransactionSignature>> {
  return new Promise((resolve, reject) => {
    formCancelOrderContext(context, marketAddress)
      .then((orderContext) => {
        let cancelTx = context.program.transaction.cancelOrderByClientOrderId(
          side,
          clientOrderId,
          {
            accounts: orderContext,
          }
        );
        signAndSendTransaction(context, cancelTx)
          .then((cancelRes) => {
            if (cancelRes.resultType === TransactionResultType.Successful) {
              resolve({
                successful: true,
                data: cancelRes.txId as TransactionSignature,
              });
            } else {
              console.error(cancelRes);
              reject(cancelRes);
            }
          })
          .catch((err) => reject(err));
      })
      .catch((err) => reject(err));
  });
}