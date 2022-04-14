import * as anchor from "@project-serum/anchor";
import Context from "../../types/context";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../../types/instructionResult";
import { calculatePcQtyAndFee, formPlaceOrderContext } from "../../utils/orders";
import { OrderSide } from "../../types/optifi-exchange-types";
import marginStress from "../marginStress";
import { USDC_DECIMALS } from "../../constants";
import { numberAssetToDecimal, numberToOptifiAsset } from "../../utils/generic";
import OrderType, { orderTypeToNumber } from "../../types/OrderType";

export default function placeOrder(context: Context,
    marketAddress: PublicKey,
    side: OrderSide,
    price: number,
    size: number,
    orderType: OrderType
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        formPlaceOrderContext(context, marketAddress).then(async ([orderContext, asset]) => {

            let limit = price * (10 ** USDC_DECIMALS) / (10 ** numberAssetToDecimal(asset)!); // price for 1 lot_size 

            let maxCoinQty = size * (10 ** numberAssetToDecimal(asset)!);

            let PcQty = limit * maxCoinQty;

            let [totalPcQty, maxPcQty, totalFee] = calculatePcQtyAndFee(PcQty, side, orderType, false)!;

            console.log("side: ", side);
            console.log("limit: ", limit);
            console.log("maxCoinQty: ", maxCoinQty);
            console.log("totalFee: ", totalFee);
            console.log("maxPcQty: ", maxPcQty);
            console.log("totalPcQty: ", totalPcQty);


            let ix = await marginStress(context, asset);

            context.program.rpc.placeOrder(
                side,
                new anchor.BN(limit),
                new anchor.BN(maxCoinQty),
                new anchor.BN(maxPcQty),
                new anchor.BN(new Date().getTime() / 1000), // use current timestamp as client defined order id
                new anchor.BN(orderTypeToNumber(orderType)),
                {
                    accounts: orderContext,
                    instructions: ix
                }
            ).then((res) => {
                resolve({
                    successful: true,
                    data: res as TransactionSignature
                })
            }).catch((err) => reject(err))

        }).catch((err) => reject(err))
    })
}