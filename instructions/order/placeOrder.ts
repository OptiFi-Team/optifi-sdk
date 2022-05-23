import * as anchor from "@project-serum/anchor";
import Context from "../../types/context";
import { ComputeBudgetInstruction, ComputeBudgetProgram, LAMPORTS_PER_SOL, PublicKey, Transaction, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../../types/instructionResult";
import { calculatePcQtyAndFee, formPlaceOrderContext } from "../../utils/orders";
import { OrderSide, UserAccount } from "../../types/optifi-exchange-types";
import marginStress from "../marginStress";
import { USDC_DECIMALS } from "../../constants";
import { numberAssetToDecimal } from "../../utils/generic";
import OrderType, { orderTypeToNumber } from "../../types/OrderType";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

export default function placeOrder(context: Context,
    userAccount: UserAccount,
    marketAddress: PublicKey,
    side: OrderSide,
    price: number,
    size: number,
    orderType: OrderType
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        formPlaceOrderContext(context, marketAddress, userAccount).then(async ([orderContext, asset]) => {

            let limit = price * (10 ** USDC_DECIMALS) / (10 ** numberAssetToDecimal(asset)!); // price for 1 lot_size 

            let maxCoinQty = size * (10 ** numberAssetToDecimal(asset)!);

            let PcQty = limit * maxCoinQty;

            let [totalPcQty, maxPcQty, totalFee] = calculatePcQtyAndFee(context, PcQty, side, orderType, false)!;

            console.log("side: ", side);
            console.log("limit: ", limit);
            console.log("maxCoinQty: ", maxCoinQty);
            console.log("totalFee: ", totalFee);
            console.log("maxPcQty: ", maxPcQty);
            console.log("totalPcQty: ", totalPcQty);


            let ix = await marginStress(context, asset);

            // // Add computing units, but currently no use in devnet 

            // const params = {
            //     units: 2000000,
            //     additionalFee: 4 * LAMPORTS_PER_SOL,
            // };

            // let addComputeIx = ComputeBudgetProgram.requestUnits(params);

            // ix.unshift(addComputeIx)

            let placeOrderIx = context.program.instruction.placeOrder(
                side,
                new anchor.BN(limit),
                new anchor.BN(maxCoinQty),
                new anchor.BN(maxPcQty),
                new anchor.BN(orderTypeToNumber(orderType)),
                {
                    accounts: orderContext,
                }
            );

            ix.push(placeOrderIx);

            context.program.rpc.settleOrderFunds({
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
                    serumDexProgramId: orderContext.serumDexProgramId
                },
                instructions: ix
            }).then((res) => {
                resolve({
                    successful: true,
                    data: res as TransactionSignature
                })
            }).catch((err) => reject(err))

        }).catch((err) => reject(err))
    })
}