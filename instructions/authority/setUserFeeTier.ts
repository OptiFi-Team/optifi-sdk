import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findUserAccount } from "../../utils/accounts";
import { FeeTier } from "../../types/optifi-exchange-types";
import { findUserFeeAccount } from "../user/initializeFeeAccount";

export default function setUserFeeTier(context: Context, user: PublicKey, feeTier: FeeTier): Promise<InstructionResult<TransactionSignature>> {
  return new Promise((resolve, reject) => {
    findExchangeAccount(context)
      .then(async ([exchangeAddress, _]) => {
        let [userAccount] = await findUserAccount(context, user);
        let [feeAccount] = await findUserFeeAccount(context, exchangeAddress, userAccount);
        context.program.rpc
          .setUserFeeTier(feeTier, {
            accounts: {
              optifiExchange: exchangeAddress,
              operationAuthority: context.provider.wallet.publicKey,
              user: user,
              userAccount: userAccount,
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
