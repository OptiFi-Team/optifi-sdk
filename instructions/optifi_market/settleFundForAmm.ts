import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, } from "../../utils/accounts";
import { AmmAccount, } from "../../types/optifi-exchange-types";
import { findOptifiUSDCPoolAuthPDA, getAmmLiquidityAuthPDA } from "../../utils/pda";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

export default function settleFundForAmm(context: Context,
    ammToSettle: PublicKey,
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        let [ammLiquidityAuth,] = await getAmmLiquidityAuthPDA(context);
        let [exchangeAddress, _] = await findExchangeAccount(context)
        let optifiExchangeInfo = await context.program.account.exchange.fetch(exchangeAddress)
        let [centralUsdcPoolAuth,] = await findOptifiUSDCPoolAuthPDA(context)
        context.program.account.ammAccount.fetch(ammToSettle).then((ammRes) => {
            // @ts-ignore
            let amm = ammRes as AmmAccount;
            let settleFundForAmmTx = context.program.rpc.settleFundForAmm({
                accounts: {
                    optifiExchange: exchangeAddress,
                    ammAccount: ammToSettle,
                    ammUsdcVault: amm.quoteTokenVault,
                    ammLiquidityAuth,
                    centralUsdcPool: optifiExchangeInfo.usdcCentralPool,
                    centralUsdcPoolAuth: centralUsdcPoolAuth,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    usdcMint: optifiExchangeInfo.usdcMint,
                }
            })
            settleFundForAmmTx.then((res) => {
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
