import Context from "../types/context";
import { PublicKey } from "@solana/web3.js";
import { Chain, OrderSide } from "../types/optifi-exchange-types";
import { findUserAccount } from './accounts'
import { calculateMargin, stress_function, option_intrinsic_value, reshap } from "./calculateMargin";
import { parseAggregatorAccountData } from "@switchboard-xyz/switchboard-api"
import { SWITCHBOARD, USDC_DECIMALS } from "../constants";

export const r = 0;
export const q = 0;
export const stress = 0.3;

/**
 * calc user's margin requirement for all existing positions
 */
export function calcMarginRequirementForUser(
    context: Context,
    userAccountAddressInput?: PublicKey,
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
            let userAccountAddress = userAccountAddressInput || await findUserAccount(context)[0];
            let userAccountInfo = await context.program.account.userAccount.fetch(userAccountAddress);
            // console.log(userAccountInfo)
            let positions = userAccountInfo.positions

            // calc user's net positons for each instrument
            // @ts-ignore
            let userNetPositions = positions.map(position => position.longQty.sub(position.shortQty).toNumber()
            )

            // get user's trading instruments info
            // @ts-ignore
            let userTradingInstruments = positions.map(position => position.instrument)
            let instrumentAccountInfosRaw = await context.program.account.chain.fetchMultiple(userTradingInstruments);
            let instrumentAccountInfos = instrumentAccountInfosRaw as Chain[];
            instrumentAccountInfos.forEach((instrument, i) => {
                let maturity = (instrument.expiryDate.toNumber() - new Date().getTime() / 1000) / (60 * 60 * 24 * 365)
                if (maturity < 0) {
                    return
                }
                if (instrument.asset == 0) {
                    netPositionsBTC.push(userNetPositions[i] / (10 ** USDC_DECIMALS))
                    tBTC.push(maturity)
                    strikeBTC.push(instrument.strike.toNumber());
                    isCallBTC.push(Object.keys(instrument.instrumentType)[0] === "call" ? 1 : 0)

                } else if (instrument.asset == 1) {
                    netPositionsETH.push(userNetPositions[i] / (10 ** USDC_DECIMALS))
                    tETH.push(maturity)
                    strikeETH.push(instrument.strike.toNumber());
                    isCallETH.push(Object.keys(instrument.instrumentType)[0] === "call" ? 1 : 0)
                }
            })

            // console.log('tBTC: ', tBTC);
            // console.log('isCallBTC: ', isCallBTC);
            // console.log('strikeBTC: ', strikeBTC);
            // console.log('netPositionsBTC: ', netPositionsBTC);
            // console.log('netPositionsETH: ', netPositionsETH);

            // Calc margin requirement for both BTC and ETH options
            let usdcSpot = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_USDC_USD))
            let marginForBTC = 0
            let marginForETH = 0
            if (netPositionsBTC.length > 0) {
                // calc margin requriement for BTC postions
                marginForBTC = await calcMarginForOneAsset(context, 0, usdcSpot.lastRoundResult?.result!, strikeBTC, isCallBTC, netPositionsBTC, tBTC)
                // console.log("marginForBTC: ", marginForBTC)

            }
            if (netPositionsETH.length > 0) {
                // calc margin requriement for ETH postions
                marginForETH = await calcMarginForOneAsset(context, 1, usdcSpot.lastRoundResult?.result!, strikeETH, isCallETH, netPositionsETH, tETH)
                // console.log("marginForETH: ", marginForETH)
            }

            // get the total margin
            let res = Math.abs(marginForBTC) + Math.abs(marginForETH)

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
    userAccountAddress: PublicKey,
    marketAddress: PublicKey,
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
            //  let [userAccountAddress, _] = await findUserAccount(context)
            let userAccountInfo = await context.program.account.userAccount.fetch(userAccountAddress);
            // console.log(userAccountInfo)
            let positions = userAccountInfo.positions

            // calc user's net positons for each instrument
            // @ts-ignore
            let userNetPositions = positions.map(position => position.longQty.sub(position.shortQty).toNumber()
            )

            // take the new order into account
            let marketAccountInfo = await context.program.account.optifiMarket.fetch(marketAddress)
            // @ts-ignore
            let i = positions.findIndex(e => e.instrument.toString() == marketAccountInfo.instrument.toString())
            if (i > -1) {
                if (side === OrderSide.Ask) {
                    userNetPositions[i] -= maxCoinQty;
                }
                // if Bid order, val + orderSize
                else {
                    userNetPositions[i] += maxCoinQty;
                }
            } else {
                if (side === OrderSide.Ask) {
                    // @ts-ignore
                    positions.push(
                        {
                            instrument: marketAccountInfo.instrument,
                            longQty: 0,
                            shortQty: maxCoinQty
                        })
                    userNetPositions.push(-maxCoinQty);

                } else {
                    // @ts-ignore
                    positions.push(
                        {
                            instrument: marketAccountInfo.instrument,
                            longQty: maxCoinQty
                        })
                    userNetPositions.push(maxCoinQty);
                }
            }

            // get user's trading instruments info
            // @ts-ignore
            let userTradingInstruments = positions.map(position => position.instrument)
            let instrumentAccountInfosRaw = await context.program.account.chain.fetchMultiple(userTradingInstruments);
            let instrumentAccountInfos = instrumentAccountInfosRaw as Chain[];
            instrumentAccountInfos.forEach((instrument, i) => {
                let maturity = (instrument.expiryDate.toNumber() - new Date().getTime() / 1000) / (60 * 60 * 24 * 365)
                if (maturity < 0) {
                    return
                }
                if (instrument.asset == 0) {
                    netPositionsBTC.push(userNetPositions[i] / (10 ** USDC_DECIMALS))
                    tBTC.push(maturity)
                    strikeBTC.push(instrument.strike.toNumber());
                    isCallBTC.push(Object.keys(instrument.instrumentType)[0] === "call" ? 1 : 0)
                } else if (instrument.asset == 1) {
                    netPositionsETH.push(userNetPositions[i] / (10 ** USDC_DECIMALS))
                    tETH.push(maturity)
                    strikeETH.push(instrument.strike.toNumber());
                    isCallETH.push(Object.keys(instrument.instrumentType)[0] === "call" ? 1 : 0)
                }
            })

            // console.log('tBTC: ', tBTC);
            // console.log('isCallBTC: ', isCallBTC);
            // console.log('strikeBTC: ', strikeBTC);
            // console.log('netPositionsBTC: ', netPositionsBTC);
            // console.log('netPositionsETH: ', netPositionsETH);

            // Calc margin requirement for both BTC and ETH options
            // Calc margin requirement for both BTC and ETH options
            let usdcSpot = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_USDC_USD))
            let marginForBTC = 0
            let marginForETH = 0
            if (netPositionsBTC.length > 0) {
                // calc margin requriement for BTC postions
                marginForBTC = await calcMarginForOneAsset(context, 0, usdcSpot.lastRoundResult?.result!, strikeBTC, isCallBTC, netPositionsBTC, tBTC)
                console.log("marginForBTC: ", marginForBTC)

            }
            if (netPositionsETH.length > 0) {
                // calc margin requriement for ETH postions
                marginForETH = await calcMarginForOneAsset(context, 1, usdcSpot.lastRoundResult?.result!, strikeETH, isCallETH, netPositionsETH, tETH)
                console.log("marginForETH: ", marginForETH)
            }

            // get the total margin
            let res = Math.abs(marginForBTC) + Math.abs(marginForETH)

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
                context, userAccountAddress, marketAddress, side, maxCoinQty,
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

export async function getSpotnIv(context: Context) {
    let spotRes = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD));
    spotRes = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD))

    let ivRes = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_IV))
    ivRes = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_IV))

    let usdcSpot = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_USDC_USD))

    let spot = spotRes.lastRoundResult?.result! / usdcSpot.lastRoundResult?.result!
    let iv = ivRes.lastRoundResult?.result! / 100

    let result = [spotRes, ivRes];

    return result
}

async function calcMarginForOneAsset(context: Context, asset: number, usdcSpot: number, strikeRaw: number[], isCallRaw: number[], userPositionsRaw: number[], tRaw: number[]): Promise<number> {
    let strike = reshap(strikeRaw)
    let t = reshap(tRaw)
    let isCall = reshap(isCallRaw)
    let userPositions = reshap(userPositionsRaw)

    let spotRes = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD))
    let ivRes = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_IV))
    switch (asset) {
        case 0:
            spotRes = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD))
            ivRes = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_IV))
            break
        case 1:
            spotRes = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_USD))
            ivRes = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_IV))
            break
        default:
            throw Error("unsupported asset type")
    }
    let spot = spotRes.lastRoundResult?.result! / usdcSpot
    let iv = ivRes.lastRoundResult?.result! / 100

    let intrinsic = option_intrinsic_value(spot, strike, isCall);

    // console.log("spot, strike, iv, r, q, t, stress, isCall ", spot, strike, iv, r, q, t, stress, isCall);
    let stress_results = stress_function(spot, strike, iv, r, q, t, stress, isCall);
    // console.log("stress_results", stress_results);
    let price = stress_results['Price'];
    let stress_price_change = stress_results['Stress Price Delta'];
    // console.log("strike: ", strike)
    // console.log("is call: ", isCall)
    // console.log("iv: ", iv)

    // console.log("userPositions, spot, t, price, intrinsic, stress_price_change", userPositions, spot, t, price, intrinsic, stress_price_change)
    let margin_result = calculateMargin(userPositions, spot, t, price, intrinsic, stress_price_change);
    let margin = margin_result["Total Margin"]
    return margin
}