import * as anchor from "@project-serum/anchor";
import Context from "../../types/context";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../../types/instructionResult";
import { calculatePcQtyAndFee, formPlaceOrderContext } from "../../utils/orders";
import { OrderSide, UserAccount } from "../../types/optifi-exchange-types";
import marginStress from "../marginStress/marginStress";
import { USDC_DECIMALS } from "../../constants";
import { numberAssetToDecimal } from "../../utils/generic";
import OrderType, { orderTypeToNumber } from "../../types/OrderType";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { increaseComputeUnitsIx } from "../../utils/transactions";
import { findMarginStressWithAsset } from "../../utils/margin";
import { getSpotPrice } from "../../utils/pyth";
import { findSerumAuthorityPDA } from "../../utils/pda";

export default function placeOrder(
    context: Context,
    userAccount: UserAccount,
    marketAddress: PublicKey,
    side: OrderSide,
    price: number,
    size: number,
    orderType: OrderType
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        try {
            let [orderContext, asset] = await formPlaceOrderContext(context, marketAddress, userAccount);

            let limit = (price * 10 ** USDC_DECIMALS) / 10 ** numberAssetToDecimal(asset)!; // price for 1 lot_size

            let maxCoinQty = size * 10 ** numberAssetToDecimal(asset)!;

            let PcQty = limit * maxCoinQty;

            let spotPrice = Math.round(((await getSpotPrice(context, asset)) / (await getSpotPrice(context, 2))) * 100) / 100;

            let [totalPcQty, maxPcQty, totalFee] = calculatePcQtyAndFee(context, spotPrice, size, price, side, orderType, false)!;

            // console.log("side: ", side);
            // console.log("limit: ", limit);
            // console.log("maxCoinQty: ", maxCoinQty);
            // console.log("totalFee: ", totalFee);
            // console.log("maxPcQty: ", maxPcQty);
            // console.log("totalPcQty: ", totalPcQty);

            let ixs = [increaseComputeUnitsIx];
            // ixs.push(...(await marginStress(context, asset)));

            // add place order ix
            let placeOrderIx = context.program.instruction.placeOrder(
                side,
                new anchor.BN(limit),
                new anchor.BN(maxCoinQty),
                new anchor.BN(maxPcQty * 10 ** USDC_DECIMALS),
                new anchor.BN(orderTypeToNumber(orderType)),
                {
                    accounts: {
                        optifiExchange: orderContext.optifiExchange,
                        userAccount: orderContext.userAccount,
                        optifiMarket: marketAddress,
                        serumMarket: orderContext.serumMarket,
                        openOrders: orderContext.openOrders,
                        coinVault: orderContext.coinVault,
                        pcVault: orderContext.pcVault,
                        asks: orderContext.asks,
                        bids: orderContext.bids,
                        requestQueue: orderContext.requestQueue,
                        eventQueue: orderContext.eventQueue,
                        coinMint: orderContext.coinMint,
                        instrumentShortSplTokenMint: orderContext.instrumentShortSplTokenMint,
                        userInstrumentLongTokenVault: orderContext.userInstrumentLongTokenVault,
                        userInstrumentShortTokenVault: orderContext.userInstrumentShortTokenVault,
                        userMarginAccount: orderContext.userMarginAccount,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        serumDexProgramId: orderContext.serumDexProgramId,
                        feeAccount: orderContext.feeAccount,
                        marginStressAccount: orderContext.marginStressAccount,
                        user: orderContext.user,
                        instrumentTokenMintAuthorityPda: orderContext.instrumentTokenMintAuthorityPda,
                        usdcFeePool: orderContext.usdcFeePool,
                        rent: orderContext.rent,
                    },
                }
            );
            ixs.push(placeOrderIx);

            // add consume event inx
            let [serumMarketAuthority] = await findSerumAuthorityPDA(context);
            let consumeEventInx = await context.program.methods
                .consumeEventQueue(5)
                .accounts({
                    optifiExchange: orderContext.optifiExchange,
                    serumMarket: orderContext.serumMarket,
                    eventQueue: orderContext.eventQueue,
                    userSerumOpenOrders: orderContext.openOrders,
                    serumDexProgramId: orderContext.serumDexProgramId,
                    consumeEventsAuthority: serumMarketAuthority,
                })
                .instruction();
            ixs.push(consumeEventInx);

            // add settle order inx
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
