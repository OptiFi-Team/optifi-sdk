import fetch from 'cross-fetch';
import { BN } from "@project-serum/anchor";
import {
    NotifiClient,
    NotifiEnvironment,
    createAxiosInstance,
} from '@notifi-network/notifi-node';
import { randomUUID } from 'crypto';
import axios from 'axios';
import Context from "../types/context";
import { findOptifiMarketsWithFullData } from "./market";
import { Order } from "./orders"
import { Position } from "./market";
import moment from 'moment';

export async function notifiMarginCallAlert(walletAddress: string, data: any) {
    try {
        let dataGet = {
            optifi_program_id: process.env.OPTIFI_PROGRAM_ID,
            wallet_address: walletAddress
        }
        console.log(dataGet)
        let userNotifiData = (await sendGet(dataGet)).result;// if this wallet_address hasn't register Notifi, it will be null

        if (userNotifiData) {//this user has registered
            let alertTimestamp = userNotifiData.alert_timestamp;
            if (alertTimestamp == "0") {//hasn't been alerted yet
                let dataPost = {
                    optifi_program_id: process.env.OPTIFI_PROGRAM_ID,
                    wallet_address: walletAddress,
                    notifi_id: userNotifiData.notifi_id,
                    magic: process.env.REACT_APP_UPDATE_USER_NOTIFI_PROFILE_MAGIC,
                    telegram_id: userNotifiData.telegram_id,
                    email_address: userNotifiData.email_address,
                    alert_timestamp: Math.floor(Date.now() / 1000).toString(),
                };
                console.log(dataPost)
                sendPost(dataPost)
                sendNotifiMarginCallAlert(walletAddress, data)
            } else {//has been alerted
                let timePassed = new BN(Math.floor(Date.now() / 1000)).sub(new BN(userNotifiData.alert_timestamp)).toNumber();
                console.log("now is " + Date.now() / 1000 + " , and send margin call alert before is " + userNotifiData.alert_timestamp)
                if (timePassed == 60 * 60 * 24) {//1 day
                    sendNotifiMarginCallAlert(walletAddress, data)
                    console.log("send notifi alert to user " + walletAddress + " again!")
                }
            }
        }
        else {
            console.log(walletAddress + "in margin call alert, but hasn't subscribe Notifi")
        }
    } catch (e) {

    }
}

function cmpArray(before, after) {
    let result = before.filter((e) => {
        return after.indexOf(e) === -1
    })
    return result;
}

export async function notifiLiquidationAlert(
    context: Context,
    walletAddress: string,
    availableBalance: number,
    openOrdersBefore: Order[],
    openOrdersAfter: Order[],
    positionBefore: Position[],
    positionAfter: Position[]
) {
    try {
        console.log("in notifiLiquidationAlert")
        let canceledOpenOrders: Order[] = cmpArray(openOrdersBefore, openOrdersAfter)
        let closedPositions: Position[] = cmpArray(positionBefore, positionAfter)
        // console.log("openOrdersBefore len: " + openOrdersBefore.length + ", openOrdersAfter len: " + openOrdersAfter.length + ", canceledOpenOrders len: " + canceledOpenOrders.length)
        // console.log("positionBefore len: " + positionBefore.length + ", positionAfter len: " + positionAfter.length + ", closedPositions len: " + closedPositions.length)

        //2.canceledOpenOrders name
        console.log("canceledOpenOrders:")
        console.log(canceledOpenOrders)
        let orderCanceled: string[] = [];
        canceledOpenOrders.map(async (canceledOpenOrder) => {
            let optifiMarkets = await findOptifiMarketsWithFullData(context);
            let market = optifiMarkets.find(e => e.marketAddress.toString() == canceledOpenOrder.marketAddress)
            if (!market) {
                console.log("can't find market when liquidate user " + walletAddress)
                return ""
            }
            let asset = market.asset
            let date = moment(canceledOpenOrder.expiryDate).format('DDMMMYY').toUpperCase();
            let strike = canceledOpenOrder.strike?.toString()
            let type = canceledOpenOrder.instrumentType
            orderCanceled.push(asset + "-" + date + "-" + strike + "-" + type)
        })
        //3.closedPositions name
        console.log("closedPositions")
        console.log(closedPositions)
        let positionsLiquidated: string[] = [];
        closedPositions.map(async (closedPosition) => {
            let asset = closedPosition.asset
            let date = moment(closedPosition.expiryDate).format('DDMMMYY').toUpperCase();
            let strike = closedPosition.strike?.toString()
            let type = closedPosition.instrumentType
            positionsLiquidated.push(asset + "-" + date + "-" + strike + "-" + type)
        })

        //4. turn array to json, then turn to string , if number , add "$"
        let orderCanceledJson = {
            "orderCanceled":
                orderCanceled.map(e => {
                    return { "orderCanceledName": e }
                })
        }
        let orderCanceledStr = JSON.stringify(orderCanceledJson)

        let positionsLiquidatedJson = {
            "positionsLiquidated":
                positionsLiquidated.map(e => {
                    return { "positionsLiquidatedName": e }
                })
        }
        let positionsLiquidatedStr = JSON.stringify(positionsLiquidatedJson)

        let availableBalanceStr = (availableBalance < 0) ? "-$" + (-availableBalance).toString() : "$" + availableBalance.toString()
        //5.send these data by notifiLiquidationAlert

        let data = {
            "availableBalance": availableBalanceStr,
            "orderCanceled": orderCanceledStr,//string
            "positionsLiquidated": positionsLiquidatedStr,//string
        }
        console.log("data")
        console.log(data)

        const env: NotifiEnvironment = 'Development';
        const axiosInstance = createAxiosInstance(axios, env);
        const client = new NotifiClient(axiosInstance);
        // Log in to obtain a token
        const { token } = await client.logIn({ sid: process.env.REACT_APP_NOTIFI_SID!, secret: process.env.REACT_APP_NOTIFI_SECRET! });//BREAK HERE

        // Use the token to send a message to anyone subscribed to that wallet

        await client.sendDirectPush(token, {
            key: randomUUID(), // Idempotency key, use the same value for each unique event
            walletBlockchain: 'SOLANA', // Or 'SOLANA'
            walletPublicKey: walletAddress, // Or other address
            message: 'Optifi liquidate alert',
            template: {
                emailTemplate: "1a09872a-8eeb-42e2-8392-2e06260dbd0e",
                telegramTemplate: "1a09872a-8eeb-42e2-8392-2e06260dbd0e",
                variables: {
                    "availableBalance": data.availableBalance,
                    "orderCanceled": data.orderCanceled,
                    "positionsLiquidated": data.positionsLiquidated,
                }
            }
        });
        console.log("success sendDirectPush to notifi!")
    } catch (e) {
        console.log("send liquidation alert to notifi fail")
        console.log(e)
    }
}

export async function sendPost(data: any) {
    try {
        const response = await fetch("https://lambda.optifi.app/update_user_notifi_profile", {
            method: "POST",
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`Error! status: ${response.status}`);
        }
    } catch (error) { console.log(error) }
}

//https://lambda.optifi.app/get_user_notifi_profile?optifi_program_id=DeVoPfWrDn2UTA1MbSfagvpQxA91MpNFQnhHRw19dK34&wallet_address=AhpECjgohVD1zqR4CjmcGgyQZFyFJqewfntRbggP7E36
export async function sendGet(data: any) {
    try {
        let url = "https://lambda.optifi.app/get_user_notifi_profile?optifi_program_id=" + data.optifi_program_id +
            "&wallet_address=" + data.wallet_address
        const response = await fetch(url, {
            method: "GET",
        });
        let res = await response.json()
        if (!response.ok) {
            console.log("no user data in notifi");
        }
        return res;
    } catch (error) { console.log(error) }
}

export async function sendNotifiMarginCallAlert(walletAddress: string, data: any) {
    try {
        const env: NotifiEnvironment = 'Development';
        const axiosInstance = createAxiosInstance(axios, env);
        const client = new NotifiClient(axiosInstance);
        // Log in to obtain a token
        const { token } = await client.logIn({ sid: process.env.REACT_APP_NOTIFI_SID!, secret: process.env.REACT_APP_NOTIFI_SECRET! });//BREAK HERE

        // Use the token to send a message to anyone subscribed to that wallet
        await client.sendDirectPush(token, {
            key: randomUUID(), // Idempotency key, use the same value for each unique event
            walletBlockchain: 'SOLANA', // Or 'SOLANA'
            walletPublicKey: walletAddress, // Or other address
            message: 'Optifi margin call alert',
            template: {
                emailTemplate: "663a713e-2873-49d2-8e12-deb4f436db9c",
                telegramTemplate: "663a713e-2873-49d2-8e12-deb4f436db9c",
                variables: {
                    "availableBalance": data.availableBalance,
                    "accountEquity": data.accountEquity,
                    "marginRequirement": data.marginRequirement,
                    "liquidationBuffer": data.liquidationBuffer,
                    "TGLiquidationBuffer": data.liquidationBuffer,
                }
            }
        });
        console.log("success sendDirectPush to notifi!")
    } catch (e) {
        console.log("send margin call alert to notifi fail")
        console.log(e)
    }
}
