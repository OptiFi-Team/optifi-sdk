import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, } from "../../utils/accounts";
import { UserAccount, } from "../../types/optifi-exchange-types";
import { findOptifiUSDCPoolPDA } from "../../utils/pda";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";


export default function settleFundForUser(context: Context,
    userToSettle: PublicKey,
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        let [exchangeAddress, _] = await findExchangeAccount(context)
        let optifiExchangeInfo = await context.program.account.exchange.fetch(exchangeAddress)
        let [centralUsdcPoolAuth,] = await findOptifiUSDCPoolPDA(context)
        context.program.account.userAccount.fetch(userToSettle).then((userAccountRes) => {
            // @ts-ignore
            let userAccount = userAccountRes as UserAccount;
            let settleFundForOneUserTx = context.program.rpc.settleFundForOneUser({
                accounts: {
                    optifiExchange: exchangeAddress,
                    userAccount: userToSettle,
                    userMarginAccountUsdc: userAccount.userMarginAccountUsdc,
                    centralUsdcPool: optifiExchangeInfo.usdcCentralPool,
                    centralUsdcPoolAuth: centralUsdcPoolAuth,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    usdcMint: optifiExchangeInfo.usdcMint,
                }
            })
            settleFundForOneUserTx.then((res) => {
                resolve({
                    successful: true,
                    data: res as TransactionSignature
                })
            }).catch((err) => {
                console.error(err);
                reject(err);
            })
        })
    })
}
