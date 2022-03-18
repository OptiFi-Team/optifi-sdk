import * as anchor from "@project-serum/anchor";
import Context from "../types/context";
import { PublicKey, Transaction, TransactionInstruction, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";
import { formPlaceOrderContext } from "../utils/orders";
import marginStress from "./marginStress";
import { isUserInitializedOnMarket } from "../utils/market";
import { createInitUserOnOptifiMarketInstruciton } from "./initUserOnOptifiMarket";
import {formOrderContext} from "../utils/orders";
import { OracleDataType, OrderSide} from "../types/optifi-exchange-types";
import { OptifiMarket } from "../types/optifi-exchange-types";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";

import { findUserAccount } from '../utils/accounts'
import { calculateMargin, stress_function, option_intrinsic_value } from "../utils/calculateMargin";
import { getPosition, findOptifiMarkets } from "../utils/market";

// t        sdk api, check the comment above
// spot     oracle
// rate     hardcode
// q        hardcode
// iv       oracle
// stress   0.3
// strike   sdk api, check the comment above
// isCall   sdk api, check the comment above
function reshap(arr: number[]) {

    const newArr: number[][] = [];
    while (arr.length) newArr.push(arr.splice(0, 1));
    return newArr
}

let marketName = "user's input";
let orderSize = 2;  // or do i hv to use OrderSize.Ask?
let orderSide = OrderSide.Ask;
let price = 34500;
let spot = OracleDataType.Spot;
let iv = OracleDataType.IV;
let r = 0, q = 0, stress = 0.3;

export default function placeOrder(context: Context,
    marketAddress: PublicKey,
    side: OrderSide,
    limit: number,
    maxCoinQty: number,
    maxPcQty: number
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        formPlaceOrderContext(context, marketAddress).then(async ([orderContext, asset]) => {
            console.log("side: ", side);
            console.log("limit: ", limit);
            console.log("maxCoinQty: ", maxCoinQty);
            console.log("maxPcQty: ", maxPcQty);


            let ix = await marginStress(context, asset);

            context.program.rpc.placeOrder(
                side,
                new anchor.BN(limit),
                new anchor.BN(maxCoinQty),
                new anchor.BN(maxPcQty),
                new anchor.BN(new Date().getTime() / 1000), // use current timestamp as client defined order id
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

export function placeOrderWithInitUserOnMarket(context: Context,
    marketAddress: PublicKey,
    side: OrderSide,
    limit: number,
    maxCoinQty: number,
    maxPcQty: number
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        let [orderContext, asset] = await formPlaceOrderContext(context, marketAddress)
        console.log("side: ", side);
        console.log("limit: ", limit);
        console.log("maxCoinQty: ", maxCoinQty);
        console.log("maxPcQty: ", maxPcQty);

        let isStarted = await isUserInitializedOnMarket(context, marketAddress, "processed")
        console.log("isStarted: ", isStarted)
        let ix = await marginStress(context, asset);
        // if user hasn't been initialized on the market, add the inx to the tx
        if (!isStarted) {
            console.log("adding createInitUserOnOptifiMarketInstruciton")
            let i = await createInitUserOnOptifiMarketInstruciton(context, marketAddress)
            console.log(i)
            i.forEach(i => console.log(i.keys.map(e => e.pubkey.toString())))

            ix.push(...i)
        }

        context.program.rpc.placeOrder(
            side,
            new anchor.BN(limit),
            new anchor.BN(maxCoinQty),
            new anchor.BN(maxPcQty),
            new anchor.BN(new Date().getTime() / 1000), // use current timestamp as client defined order id
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

        //     poolTx.add(
        //         a
        //     )
        // signAndSendTransaction(context, poolTx, [])
        //     .then((res) => {
        //         // if (res.resultType === TransactionResultType.Successful) {
        //         //     console.debug("Created USDC pool")
        //         //     resolve(res);
        //         // } else {
        //         //     console.error("Pool initialization was not successful", res);
        //         //     reject(res);
        //         // }
        //     }).catch((err) => reject(err))




    })
}


export function preCalcMarginForNewOrder(context: Context,
    market: OptifiMarket, 
    userAccountAddress: PublicKey,
    side: OrderSide,
    limit: number,
    maxCoinQty: number,
    maxPcQty: number
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        // fetch user’s all existing positions on all markets by using the getPosition function
        let map = new Map();
        let result = new Array<typeof map>();
        let t = new Array<typeof Number>();
        let isCall = new Array();
        let strike = new Array();

        findUserAccount(context).then(([userAccountAddress, _]) => {
            findOptifiMarkets(context).then(async (markets) => {
                Promise.all(
                    markets.map(async (market) => {
                        let [longAmount, shortAmount] = await getPosition(context,
                            market[0],
                            userAccountAddress,
                        );
                        // map key: market name, value: longAmount - shortAmount
                        // result = [{"0x123123": -2}, {"0x1223423": 2}]
                        map.set(market, (longAmount - shortAmount));
                        result.push(map);

                        // @ts-ignore
                        context.program.account.chain.fetch((market[1] as OptifiMarket).instrument).then((res) => {
                            // @ts-ignore   res is instruments detail info. (res.expiryDate)
                            // still need calculation
                            t.push(res.expiryDate)

                            // check res.instrumentType and if it is call then 1, put for 0
                            res.instrumentType === "call" ? isCall.push(1) : isCall.push(0);
                            
                            // you also can find strike here too
                            strike.push(res.strike);
                        })
                    })
                )
            }).catch((err) => console.log(err))
        })

        console.log('t: ', t);
        console.log('isCall: ', isCall);
        console.log('strike: ', strike);

        // get new order details from users
        // Take market, orderSize, orderSide, price from user
        // orderSize: 2
        // orderSide: Ask
        // market[2] = {
        //     "0x2342" : 2 - 2
        // }
        result.map((market, index) => {
            if(marketName === market[0]) {
                // or do i hv to use OrderSize.Ask?
                // if Ask order, val - orderSize
                // obj.key to compare with OrderSide.Ask
                if(orderSide === OrderSide.Ask) {
                    market.set(market[0], market[1] - orderSize);
                }
                // if Bid order, val + orderSize
                else {
                    market.set(market[0], market[1] + orderSize);
                }
            }
        });

        let user = [...result.values()];
        let intrinsic = option_intrinsic_value(spot, strike, isCall);
        let stress_results = stress_function(spot, strike, iv, r, q, t, stress, isCall);
        let price = stress_results['Price'];
        let stress_price_change = stress_results['Stress Price Delta'];

        let margin_result = calculateMargin(user, spot, t, price, intrinsic, stress_price_change);

        // where is getUserBalance function?
        let userMarginBalance = 0.0;

        // Compare user's margin balance and margin_result
        // Return the required margin back to user and tell them 
        // if more margin need to be deposited for placing such an order
        if(margin_result['Total Margin'] < userMarginBalance) {
            resolve({
                successful : true
            })
        }
        else {
            reject({
                successful: false,
                data: margin_result['Total Margin']
            })
        }
    })
}