import * as anchor from "@project-serum/anchor";
import Context from "../types/context";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";
import { Chain, OrderSide } from "../types/optifi-exchange-types";
import { OptifiMarket } from "../types/optifi-exchange-types";
import { findUserAccount } from './accounts'
import { calculateMargin, stress_function, option_intrinsic_value } from "./calculateMargin";
import { getPosition, findOptifiMarkets, getTokenAmount } from "./market";
import UserPosition from "../types/user";
import { parseAggregatorAccountData } from "@switchboard-xyz/switchboard-api"
import { SWITCHBOARD } from "../constants";
import { getAccount } from "@solana/spl-token";

export const r = 0;
export const q = 0;
export const stress = 0.3;

/**
 * calc user's margin requirement for all existing positions
 */
export function calcMarginRequirementForUser(
    context: Context,
    // userAccountAddress?: PublicKey,
): Promise<number> {
    return new Promise(async (resolve, reject) => {
        try {
            let netPositionsBTC: number[] = [];
            let tBTC: number[] = [];
            let isCallBTC: number[] = [];
            let strikeBTC: number[] = [];

            let netPositionsETH: number[] = [];
            let tETH: number[] = [];
            let isCallETH: number[] = [];
            let strikeETH: number[] = [];

            // get user's all existing positons from user account
            let [userAccountAddress, _] = await findUserAccount(context)
            let userAccountInfo = await context.program.account.userAccount.fetch(userAccountAddress);
            console.log(userAccountInfo)
            let positions = userAccountInfo.positions

            // calc user's net positons for each instrument
            // @ts-ignore
            let userNetPositions = positions.map(position => position.longQty.sub(position.shortQty).toNumber()
            )

            console.log("userNetPositions: ", userNetPositions)
            // get user's trading instruments info
            // @ts-ignore
            let userTradingInstruments = positions.map(position => position.instrument)
            let instrumentAccountInfosRaw = await context.program.account.chain.fetchMultiple(userTradingInstruments);
            let instrumentAccountInfos = instrumentAccountInfosRaw as Chain[];
            instrumentAccountInfos.forEach((instrument, i) => {
                if (instrument.asset == 0) {
                    netPositionsBTC.push(userNetPositions[i])
                    let maturity = (new anchor.BN(new Date().getTime() / 1000)).sub(instrument.expiryDate).divn(60 * 60 * 24 * 365).toNumber()
                    tBTC.push(maturity)
                    strikeBTC.push(instrument.strike.toNumber());
                    isCallBTC.push(Object.keys(instrument.instrumentType)[0] === "call" ? 1 : 0)

                } else if (instrument.asset == 0) {
                    netPositionsETH.push(userNetPositions[i])
                    let maturity = new anchor.BN(new Date().getTime() / 1000).sub(instrument.expiryDate).divn(60 * 60 * 24 * 365).toNumber()
                    tETH.push(maturity)
                    strikeETH.push(instrument.strike.toNumber());
                    isCallETH.push(Object.keys(instrument.instrumentType)[0] === "call" ? 1 : 0)
                }
            })

            console.log('tBTC: ', tBTC);
            console.log('isCallBTC: ', isCallBTC);
            console.log('strikeBTC: ', strikeBTC);
            console.log('netPositionsETH: ', netPositionsETH);

            // Calc margin requirement for both BTC and ETH options
            let usdcSpot = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_USDC_USD))
            let marginForBTC = 0
            let marginForETH = 0
            {
                // calc margin requriement for BTC postions
                let btcSpot = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD))
                let spot = btcSpot.lastRoundResult?.result! / usdcSpot.lastRoundResult?.result!
                let btcIv = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_IV))
                let iv = btcIv.lastRoundResult?.result!
                console.log("cp2")
                let intrinsic = option_intrinsic_value(spot, strikeBTC, isCallBTC);
                console.log("intrinsic: ", intrinsic)
                console.log("stress_function params: ", spot, strikeBTC, iv, r, q, tBTC, stress, isCallBTC)
                let stress_results = stress_function(spot, strikeBTC, iv, r, q, tBTC, stress, isCallBTC);
                console.log("stress_results: ", stress_results)

                let price = stress_results['Price'];
                let stress_price_change = stress_results['Stress Price Delta'];

                console.log(netPositionsBTC, spot, tBTC, price, intrinsic, stress_price_change)
                let margin_result = calculateMargin(netPositionsBTC, spot, tBTC, price, intrinsic, stress_price_change);
                marginForBTC = margin_result["Total Margin"]
                console.log("marginForBTC: ", marginForBTC)
            }
            {
                // calc margin requriement for ETH postions
                let ethSpot = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_USD))
                let spot = ethSpot.lastRoundResult?.result! / usdcSpot.lastRoundResult?.result!
                let ethIv = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_IV))
                let iv = ethIv.lastRoundResult?.result!

                let intrinsic = option_intrinsic_value(spot, strikeETH, isCallETH);
                let stress_results = stress_function(spot, strikeETH, iv, r, q, tETH, stress, isCallETH);
                let price = stress_results['Price'];
                let stress_price_change = stress_results['Stress Price Delta'];
                console.log(netPositionsETH, spot, tETH, price, intrinsic, stress_price_change)
                let margin_result = calculateMargin(netPositionsETH, spot, tETH, price, intrinsic, stress_price_change);
                marginForETH = margin_result["Total Margin"]
            }

            // get the total margin
            let res = marginForBTC + marginForETH

            resolve(res)
        } catch (err) {
            reject(err)
        }
    })
}

/**
 * calc user's margin requirement for new order
 */
export function preCalcMarginForNewOrder(
    context: Context,
    marketAddress: PublicKey,
    userAccountAddress: PublicKey,
    side: OrderSide,
    maxCoinQty: number,
): Promise<number> {
    return new Promise(async (resolve, reject) => {
        try {
            let netPositionsBTC: number[] = [];
            let tBTC: number[] = [];
            let isCallBTC: number[] = [];
            let strikeBTC: number[] = [];

            let netPositionsETH: number[] = [];
            let tETH: number[] = [];
            let isCallETH: number[] = [];
            let strikeETH: number[] = [];

            // get user's all existing positons from user account
            let [userAccountAddress, _] = await findUserAccount(context)
            let userAccountInfo = await context.program.account.userAccount.fetch(userAccountAddress);
            let positions = userAccountInfo.positions as UserPosition[]

            // calc user's net positons for each instrument
            let userNetPositions = positions.map(position => position.long_qty.sub(position.short_qty).toNumber())

            // take the new order into account
            positions.forEach((e, i) => {
                if (e.instrument.equals(marketAddress)) {
                    // if Ask order, val - orderSize
                    if (side === OrderSide.Ask) {
                        userNetPositions[i] -= maxCoinQty;
                    }
                    // if Bid order, val + orderSize
                    else {
                        userNetPositions[i] += maxCoinQty;
                    }
                }
            })

            // get user's trading instruments info
            let userTradingInstruments = positions.map(position => position.instrument)
            let instrumentAccountInfosRaw = await context.program.account.chain.fetchMultiple(userTradingInstruments);
            let instrumentAccountInfos = instrumentAccountInfosRaw as Chain[];
            instrumentAccountInfos.forEach((instrument, i) => {
                if (instrument.asset == 0) {
                    netPositionsBTC.push(userNetPositions[i])
                    let maturity = new anchor.BN(new Date().getTime() / 1000).sub(instrument.expiryDate).divn(60 * 60 * 24 * 365).toNumber()
                    tBTC.push(maturity)
                    strikeBTC.push(instrument.strike.toNumber());
                    isCallBTC.push(Object.keys(instrument.instrumentType)[0] === "call" ? 1 : 0)
                } else if (instrument.asset == 0) {
                    netPositionsETH.push(userNetPositions[i])
                    let maturity = new anchor.BN(new Date().getTime() / 1000).sub(instrument.expiryDate).divn(60 * 60 * 24 * 365).toNumber()
                    tETH.push(maturity)
                    strikeETH.push(instrument.strike.toNumber());
                    isCallETH.push(Object.keys(instrument.instrumentType)[0] === "call" ? 1 : 0)
                }
            })

            console.log('tBTC: ', tBTC);
            console.log('isCallBTC: ', isCallBTC);
            console.log('strikeBTC: ', strikeBTC);
            console.log('netPositionsETH: ', netPositionsETH);

            // Calc margin requirement for both BTC and ETH options
            let usdcSpot = await parseAggregatorAccountData(context.connection, SWITCHBOARD[context.endpoint].SWITCHBOARD_USDC_USD)
            let marginForBTC = 0
            let marginForETH = 0
            {
                // calc margin requriement for BTC postions
                let btcSpot = await parseAggregatorAccountData(context.connection, SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD)
                let spot = btcSpot.lastRoundResult?.result! / usdcSpot.lastRoundResult?.result!
                let btcIv = await parseAggregatorAccountData(context.connection, SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_IV)
                let iv = btcIv.lastRoundResult?.result!

                let intrinsic = option_intrinsic_value(spot, strikeBTC, isCallBTC);
                let stress_results = stress_function(spot, strikeBTC, iv, r, q, tBTC, stress, isCallBTC);
                let price = stress_results['Price'];
                let stress_price_change = stress_results['Stress Price Delta'];

                let margin_result = calculateMargin(netPositionsBTC, spot, tBTC, price, intrinsic, stress_price_change);
                marginForBTC = margin_result["Total Margin"]
            }
            {
                // calc margin requriement for ETH postions
                let ethSpot = await parseAggregatorAccountData(context.connection, SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_USD)
                let spot = ethSpot.lastRoundResult?.result! / usdcSpot.lastRoundResult?.result!
                let ethIv = await parseAggregatorAccountData(context.connection, SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_IV)
                let iv = ethIv.lastRoundResult?.result!

                let intrinsic = option_intrinsic_value(spot, strikeETH, isCallETH);
                let stress_results = stress_function(spot, strikeETH, iv, r, q, tETH, stress, isCallETH);
                let price = stress_results['Price'];
                let stress_price_change = stress_results['Stress Price Delta'];
                let margin_result = calculateMargin(netPositionsETH, spot, tETH, price, intrinsic, stress_price_change);
                marginForETH = margin_result["Total Margin"]
            }

            // get the total margin
            let res = marginForBTC + marginForETH

            resolve(res)
        } catch (err) {
            reject(err)
        }
    })
}

interface MarginCheckResult {
    isSufficient: boolean,
    marginBalance: number,
    requiredMargin: number,
    amountToDeposit: number
}

/**
 * check if user's margin is sufficient for new order
 */
export function isMarginSufficientForNewOrder(
    context: Context,
    userAccountAddress: PublicKey,
    marketAddress: PublicKey,
    side: OrderSide,
    maxCoinQty: number,
): Promise<MarginCheckResult> {
    return new Promise(async (resolve, reject) => {
        try {
            let userAccountInfo = await context.program.account.userAccount.fetch(userAccountAddress);
            let userMarginBalance = (await context.connection.getTokenAccountBalance(userAccountInfo.userMarginAccountUsdc)).value.uiAmount!
            let marginRequirement = await preCalcMarginForNewOrder(
                context, marketAddress, userAccountAddress, side, maxCoinQty,
            )

            if (userMarginBalance < marginRequirement) {
                resolve({
                    isSufficient: false,
                    marginBalance: userMarginBalance,
                    requiredMargin: marginRequirement,
                    amountToDeposit: marginRequirement - userMarginBalance
                })
            } else {
                resolve({
                    isSufficient: true,
                    marginBalance: userMarginBalance,
                    requiredMargin: marginRequirement,
                    amountToDeposit: 0
                })
            }
        } catch (err) {
            reject(err)
        }
    })
}