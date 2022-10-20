import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, } from "../../utils/accounts";
import { Exchange } from "../../types/optifi-exchange-types";
import { findOptifiUSDCPoolAuthPDA } from "../../utils/pda";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { increaseComputeUnitsIx } from "../../utils/transactions";


export default function transferDeliveryFee(context: Context): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        let [exchangeAddress, _] = await findExchangeAccount(context)
        let optifiExchangeInfo = await context.program.account.exchange.fetch(exchangeAddress)
        let [centralUsdcPoolAuth,] = await findOptifiUSDCPoolAuthPDA(context)
        let exchange = optifiExchangeInfo as Exchange;
        let transferDeliveryFeeTx = context.program.rpc.transferDeliveryFee({
            accounts: {
                optifiExchange: exchangeAddress,
                usdcFeePool: exchange.usdcFeePool,
                centralUsdcPool: optifiExchangeInfo.usdcCentralPool,
                centralUsdcPoolAuth: centralUsdcPoolAuth,
                tokenProgram: TOKEN_PROGRAM_ID,
            },
            preInstructions: [increaseComputeUnitsIx]
        })
        transferDeliveryFeeTx.then((res) => {
            resolve({
                successful: true,
                data: res as TransactionSignature
            })
        }).catch((err) => {
            console.error(err);
            reject(err);
        })
    })
}
