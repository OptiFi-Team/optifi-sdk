import * as anchor from "@project-serum/anchor";
import Context from "../../types/context";
import { ComputeBudgetInstruction, ComputeBudgetProgram, LAMPORTS_PER_SOL, PublicKey, SYSVAR_CLOCK_PUBKEY, Transaction, TransactionInstruction, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../../types/instructionResult";
import { calculatePcQtyAndFee, formPlaceOrderContext } from "../../utils/orders";
import { OrderSide, UserAccount } from "../../types/optifi-exchange-types";
import marginStress from "../marginStress";
import { USDC_DECIMALS } from "../../constants";
import { numberAssetToDecimal } from "../../utils/generic";
import OrderType, { orderTypeToNumber } from "../../types/OrderType";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { DexInstructions } from '@project-serum/serum';
import { increaseComputeUnitsIx } from "../../utils/transactions";
import { findMarginStressWithAsset } from "../../utils/margin";

export default function placeOrder(context: Context,
    userAccount: UserAccount,
    marketAddress: PublicKey,
    side: OrderSide,
    price: number,
    size: number,
    orderType: OrderType
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        try {

            let [orderContext, asset] = await formPlaceOrderContext(context, marketAddress, userAccount)

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


            let ixs = [increaseComputeUnitsIx]
            ixs.push(...await marginStress(context, asset));

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

            ixs.push(placeOrderIx);

            let consumeEventInx = DexInstructions.consumeEvents({
                market: orderContext.serumMarket,
                openOrdersAccounts: [orderContext.openOrders],
                eventQueue: orderContext.eventQueue,
                pcFee: orderContext.userMarginAccount,
                coinFee: orderContext.userInstrumentLongTokenVault,
                limit: 65535,
                programId: orderContext.serumDexProgramId,
            })

            ixs.push(consumeEventInx)

            let settleOrderIx = context.program.instruction.settleOrderFunds({
                accounts: {
                    optifiExchange: orderContext.optifiExchange,
                    userAccount: orderContext.userAccount,
                    optifiMarket: marketAddress,
                    serumMarket: orderContext.serumMarket,
                    userSerumOpenOrders: orderContext.openOrders,
                    coinVault: orderContext.coinVault,
                    pcVault: orderContext.pcVault,
                    asks: orderContext.asks,
                    bids: orderContext.bids,
                    requestQueue: orderContext.requestQueue,
                    eventQueue: orderContext.eventQueue,
                    instrumentLongSplTokenMint: orderContext.coinMint,
                    instrumentShortSplTokenMint: orderContext.instrumentShortSplTokenMint,
                    userInstrumentLongTokenVault: orderContext.userInstrumentLongTokenVault,
                    userInstrumentShortTokenVault: orderContext.userInstrumentShortTokenVault,
                    userMarginAccount: orderContext.userMarginAccount,
                    vaultSigner: orderContext.vaultSigner,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    serumDexProgramId: orderContext.serumDexProgramId
                },
            });

            ixs.push(settleOrderIx)

            let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, orderContext.optifiExchange, asset);

            let placeOrderRes = await context.program.rpc.userMarginCalculate({
                accounts: {
                    optifiExchange: orderContext.optifiExchange,
                    marginStressAccount: marginStressAddress,
                    userAccount: orderContext.userAccount,
                    clock: SYSVAR_CLOCK_PUBKEY
                },
                instructions: ixs
            });

            resolve({
                successful: true,
                data: placeOrderRes as TransactionSignature
            })
        } catch (err) {
            reject(err)
        }
    })
}