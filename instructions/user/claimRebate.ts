import Context from "../../types/context";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../../types/instructionResult";
import { findExchangeAccount, findUserAccount } from "../../utils/accounts";
import { findUserFeeAccount } from "./initializeFeeAccount";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { OPUSDC_TOKEN_MINT } from "../../constants";
import { findAssociatedTokenAccount } from "../../utils/token";
import { findOptifiUSDCPoolAuthPDA } from "../../utils/pda";
import { Exchange, UserAccount } from "../../types/optifi-exchange-types";

export default function claimRebate(context: Context, refereeFeeAccount: PublicKey): Promise<InstructionResult<TransactionSignature>> {
  return new Promise((resolve, reject) => {
    findExchangeAccount(context)
      .then(([exchangeAddress, _]) => {
        findUserAccount(context)
          .then(async ([userAccountAddress, _]) => {
            let [feeAccount] = await findUserFeeAccount(context, exchangeAddress, userAccountAddress);

            let [centralUsdcPoolAuth] = await findOptifiUSDCPoolAuthPDA(context);

            let userAccountRes = await context.program.account.userAccount.fetch(userAccountAddress);

            let userAccount = userAccountRes as unknown as UserAccount;

            let exchangeRes = await context.program.account.exchange.fetch(exchangeAddress);
            let exchange = exchangeRes as Exchange;

            context.program.rpc
              .claimRebate({
                accounts: {
                  optifiExchange: exchangeAddress,
                  userAccount: userAccountAddress,
                  userMarginAccount: userAccount.userMarginAccountUsdc,
                  feeAccount: feeAccount,
                  user: context.provider.wallet.publicKey,
                  refereeFeeAccount: refereeFeeAccount,
                  usdcFeePool: exchange.usdcFeePool,
                  centralUsdcPoolAuth: centralUsdcPoolAuth,
                  tokenProgram: TOKEN_PROGRAM_ID,
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
