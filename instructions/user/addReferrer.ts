import Context from "../../types/context";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../../types/instructionResult";
import { findExchangeAccount, findUserAccount } from "../../utils/accounts";
import { findUserFeeAccount } from "./initializeFeeAccount";

export default function addReferrer(context: Context, referrer: PublicKey): Promise<InstructionResult<TransactionSignature>> {
  return new Promise((resolve, reject) => {
    findExchangeAccount(context)
      .then(([exchangeAddress, _]) => {
        findUserAccount(context)
          .then(async ([userAccountAddress, _]) => {
            let [feeAccount] = await findUserFeeAccount(context, exchangeAddress, userAccountAddress);

            let [referrerUserAccount] = await findUserAccount(context, referrer);

            let [referrerFeeAccount] = await findUserFeeAccount(context, exchangeAddress, referrerUserAccount);

            context.program.rpc
              .addReferrer(referrer, {
                accounts: {
                  optifiExchange: exchangeAddress,
                  userAccount: userAccountAddress,
                  feeAccount: feeAccount,
                  user: context.provider.wallet.publicKey,
                  referrerUserAccount: referrerUserAccount,
                  referrerFeeAccount: referrerFeeAccount,
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
      })
      .catch((err) => reject(err));
  });
}
