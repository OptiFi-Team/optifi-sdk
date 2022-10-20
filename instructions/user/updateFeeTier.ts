import Context from "../../types/context";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../../types/instructionResult";
import { findExchangeAccount, findUserAccount } from "../../utils/accounts";
import { findUserFeeAccount } from "./initializeFeeAccount";

export default function updateFeeTier(context: Context, userAccountAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
  return new Promise((resolve, reject) => {
    findExchangeAccount(context)
      .then(async ([exchangeAddress, _]) => {
        let [feeAccount] = await findUserFeeAccount(context, exchangeAddress, userAccountAddress);
        context.program.rpc
          .updateFeeTier({
            accounts: {
              optifiExchange: exchangeAddress,
              userAccount: userAccountAddress,
              feeAccount: feeAccount,
            },
          })
          .then((res) => {
            resolve({
              successful: true,
              data: res as TransactionSignature,
            });
          })
          .catch((err) => reject(err));
      })
      .catch((err) => reject(err));
  });
}
