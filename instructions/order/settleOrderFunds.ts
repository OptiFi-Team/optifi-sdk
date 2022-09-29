import InstructionResult from "../../types/instructionResult";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import Context from "../../types/context";
import { UserAccount } from "../../types/optifi-exchange-types";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { increaseComputeUnitsIx } from "../../utils/transactions";
import { findMarginStressWithAsset } from "../../utils/margin";
import marginStress from "../marginStress/marginStress";
import { formPlaceOrderContext } from "../../utils/orders";

export default function settleOrderFunds(context: Context, marketAddress: PublicKey, userAccount: UserAccount): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        try {
            let [orderContext, asset] = await formPlaceOrderContext(context, marketAddress, userAccount);

            let ixs = [increaseComputeUnitsIx];
            ixs.push(...(await marginStress(context, asset)));

            let settleOrderIx = context.program.instruction.settleOrderFunds({
                accounts: {
                    optifiExchange: orderContext.optifiExchange,
                    userAccount: orderContext.userAccount,
                    optifiMarket: marketAddress,
                    serumMarket: orderContext.serumMarket,
                    userSerumOpenOrders: orderContext.openOrders,
                    coinVault: orderContext.coinVault,
                    pcVault: orderContext.pcVault,
                    instrumentLongSplTokenMint: orderContext.coinMint,
                    instrumentShortSplTokenMint: orderContext.instrumentShortSplTokenMint,
                    userInstrumentLongTokenVault: orderContext.userInstrumentLongTokenVault,
                    userInstrumentShortTokenVault: orderContext.userInstrumentShortTokenVault,
                    userMarginAccount: orderContext.userMarginAccount,
                    vaultSigner: orderContext.vaultSigner,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    serumDexProgramId: orderContext.serumDexProgramId,
                    feeAccount: orderContext.feeAccount,
                },
            });

            ixs.push(settleOrderIx);

            let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, orderContext.optifiExchange, asset);

            let placeOrderRes = await context.program.rpc.userMarginCalculate({
                accounts: {
                    optifiExchange: orderContext.optifiExchange,
                    marginStressAccount: marginStressAddress,
                    userAccount: orderContext.userAccount,
                },
                instructions: ixs,
            });

            resolve({
                successful: true,
                data: placeOrderRes as TransactionSignature,
            });
        } catch (err) {
            reject(err);
        }
    });
}
