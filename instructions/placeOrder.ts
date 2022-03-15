import * as anchor from "@project-serum/anchor";
import Context from "../types/context";
import { PublicKey, Transaction, TransactionInstruction, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";
import { formPlaceOrderContext } from "../utils/orders";
import marginStress from "./marginStress";
import { isUserInitializedOnMarket } from "../utils/market";
import { createInitUserOnOptifiMarketInstruciton } from "./initUserOnOptifiMarket";
import {formOrderContext} from "../utils/orders";
import { OracleDataType, OrderSide, SpotInputOption} from "../types/optifi-exchange-types";
import { OptifiMarket } from "../types/optifi-exchange-types";
import {COIN_LOT_SIZE, MAX_COIN_QTY, MAX_PC_QTY, PC_LOT_SIZE} from "../constants";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";

import { findUserAccount } from '../utils/accounts'
import { calculateMargin } from "../utils/calculateMargin";
import { getPosition, findOptifiMarkets } from "../utils/market";

import { map } from 'rxjs';

import {getSerumMarket} from "../utils/serum";
import 'rxjs/Rx';


let marketName = "user's input";
let orderSize = 2;  // or do i hv to use OrderSize.Ask?
let orderSide = OrderSide.Ask;
let price = 34500;
let spot = OracleDataType.Spot;
let iv = OracleDataType.IV;

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
                    })
                )
            }).catch((err) => console.log(err))
        })

        // get new order details from users
        // Take market, orderSize, orderSide, price from user
        // let marketName = user's input
        // let orderSize = user's input
        // let orderSide = user's input Ask or Bid (- or +)
        // let price = user's input
        // orderSize: 2
        // orderSide: Ask
        // market[2] = {
        //     "0x2342" : 2 - 2
        // }
        result.map((market, index) => {
            if(marketName === market.get(marketName)) {
                // or do i hv to use OrderSize.Ask?
                // if Ask order, val - orderSize
                if(OrderSide.Ask) {
                    market.set(market[0], market[1] - orderSize);
                }
                // if Bid order, val + orderSize
                else {
                    market.set(market[0], market[1] + orderSize);
                }
            }
        });


        // Get params for calculateMargin like spot, t, price, intrinsic 
        // t is jan 1st : 1/365
        // spot will be fetched from oracle
        // rate
        // q
        // iv
        // stress
        // strike
        // isCall


        // then get the required margin for placing this order,
        // and compare with user’s margin balance(by getUserBalance).
        // Return the required margin back to user and tell them 
        // if more margin need to be deposited for placing such an order


    }) 
}