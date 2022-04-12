// import * as anchor from "@project-serum/anchor";
// import {PublicKey, TransactionSignature} from "@solana/web3.js";
// import InstructionResult from "../types/instructionResult";
// import Context from "../types/context";
// import {OrderSide} from "../types/optifi-exchange-types";
// import {formOrderContext} from "../utils/orders";
// import {MAX_COIN_QTY, MAX_PC_QTY} from "../constants";
// import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";

// export default function updateOrder(context: Context,
//                                     marketAddress: PublicKey,
//                                     limit: number,
//                                     side: OrderSide,
//                                     orderId: anchor.BN,
//                                     ): Promise<InstructionResult<TransactionSignature>> {
//     return new Promise((resolve, reject) => {
//         formOrderContext(context, marketAddress, side).then((orderContext) => {
//             let updateTx = context.program.transaction.updateOrder(
//                 side,
//                 new anchor.BN(limit),
//                 new anchor.BN(MAX_COIN_QTY),
//                 new anchor.BN(MAX_PC_QTY),
//                 orderId,
//                 {
//                     accounts: orderContext
//                 }
//             );
//             signAndSendTransaction(context, updateTx).then((res) => {
//                 if (res.resultType === TransactionResultType.Successful) {
//                     resolve({
//                         successful: true,
//                         data: res.txId as string,
//                     })
//                 } else {
//                     console.error(res);
//                     reject(res);
//                 }
//             }).catch((err) => reject(err));
//         }).catch((err) => reject(err));
//     })
// }