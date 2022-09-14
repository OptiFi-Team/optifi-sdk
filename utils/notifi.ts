import fetch from 'cross-fetch';
import { BN } from "@project-serum/anchor";
import {
    NotifiClient,
    NotifiEnvironment,
    createAxiosInstance,
} from '@notifi-network/notifi-node';
import { randomUUID } from 'crypto';
import axios from 'axios';

export async function sendNotifiAlert(walletAddress: string, data: any) {
    try {
        let dataGet = {
            optifi_program_id: process.env.REACT_APP_OPTIFI_PROGRAM_ID,
            wallet_address: walletAddress
        }

        let userNotifiData = (await sendGet(dataGet)).result;// if this wallet_address hasn't register Notifi, it will be null

        if (userNotifiData) {//this user has registered
            let alertTimestamp = userNotifiData.alert_timestamp;
            if (alertTimestamp == "0") {//hasn't been alerted yet
                let dataPost = {
                    optifi_program_id: process.env.REACT_APP_OPTIFI_PROGRAM_ID,
                    wallet_address: walletAddress,
                    notifi_id: userNotifiData.notifi_id,
                    magic: process.env.REACT_APP_UPDATE_USER_NOTIFI_PROFILE_MAGIC,
                    telegram_id: userNotifiData.telegram_id,
                    email_address: userNotifiData.email_address,
                    alert_timestamp: Math.floor(Date.now() / 1000).toString(),
                };
                sendPost(dataPost)
                sendAlert(walletAddress, data)
            } else {//has been alerted
                let timePassed = new BN(Math.floor(Date.now() / 1000)).sub(new BN(userNotifiData.alert_timestamp)).toNumber();
                if (timePassed = 60 * 60 * 24) {//1 day
                    sendAlert(walletAddress, data)
                    console.log("send notifi alert to user " + walletAddress + " again!")
                }
            }
        }
        else {
            console.log("in liquidate alert, but hasn't subscribe Notifi")
        }
    } catch (e) {

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

export async function sendAlert(walletAddress: string, data: any) {
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
            message: 'Optifi alert',
            template: {
                emailTemplate: "",
                telegramTemplate: "",
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
        console.log("send alert to notifi fail")
        console.log(e)
    }
}