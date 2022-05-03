import Context from "../types/context";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";
import { findExchangeAccount } from "../utils/accounts";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Exchange } from "../types/optifi-exchange-types";
import { findOptifiUSDCPoolAuthPDA } from "../utils/pda";
import { USDC_DECIMALS } from "../constants";
import * as anchor from "@project-serum/anchor";

export default function withdrawUsdcFeePool(context: Context, amount: number, withdrawDest: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(async ([exchangeAddress, _]) => {
            let exchangeRes = await context.program.account.exchange.fetch(exchangeAddress);
            // @ts-ignore
            let exchange = exchangeRes as Exchange;

            let [centralUSDCPoolAuth,] = await findOptifiUSDCPoolAuthPDA(context);

            context.program.rpc.withdrawUsdcFeePool(
                new anchor.BN(amount * 10 ** USDC_DECIMALS)
                , {
                    accounts: {
                        optifiExchange: exchangeAddress,
                        usdcFeePool: exchange.usdcFeePool,
                        centralUsdcPoolAuth: centralUSDCPoolAuth,
                        withdrawDest: withdrawDest,
                        authority: exchange.exchangeAuthority,
                        tokenProgram: TOKEN_PROGRAM_ID
                    }
                }).then((res) => {
                    resolve({
                        successful: true,
                        data: res as TransactionSignature
                    })
                }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}