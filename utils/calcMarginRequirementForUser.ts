import Context from "../types/context";
import { PublicKey } from "@solana/web3.js";
import { Chain, OrderSide } from "../types/optifi-exchange-types";
import { findUserAccount } from './accounts'
import { calculateMargin, stress_function, option_intrinsic_value, reshap } from "./calculateMargin";
import { PYTH, USDC_DECIMALS } from "../constants";
import { getPythData, getSpotPrice } from "./pyth";
import { getGvolIV } from "./getGvolIV";

export const r = 0;
export const q = 0;
export const stress = 0.3;

/**
 * calc user's margin requirement for all existing positions
 */
export function calcMarginRequirementForUser(
    context: Context,
    userAccountAddressInput?: PublicKey,
): Promise<[number, number]> {
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

            let netPositionsSOL: number[] = [];
            let tSOL: number[] = [];
            let isCallSOL: number[] = [];
            let strikeSOL: number[] = [];

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
                let maturity = instrument.expiryDate.toNumber()
                if (maturity < new Date().getTime() / 1000) {
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
                } else if (instrument.asset == 3) {
                    netPositionsSOL.push(userNetPositions[i] / (10 ** USDC_DECIMALS))
                    tSOL.push(maturity)
                    strikeSOL.push(instrument.strike.toNumber());
                    isCallSOL.push(Object.keys(instrument.instrumentType)[0] === "call" ? 1 : 0)
                }
            })

            // console.log('tBTC: ', tBTC);
            // console.log('isCallBTC: ', isCallBTC);
            // console.log('strikeBTC: ', strikeBTC);
            // console.log('netPositionsBTC: ', netPositionsBTC);
            // console.log('netPositionsETH: ', netPositionsETH);

            // Calc margin requirement for both BTC and ETH options
            let usdcSpot = await getPythData(context, new PublicKey(PYTH[context.cluster].USDC_USD))
            let marginForBTC = 0
            let marginForETH = 0
            let marginForSOL = 0
            let netOptionForBTC = 0
            let netOptionForETH = 0
            let netOptionForSOL = 0
            if (netPositionsBTC.length > 0) {
                // calc margin requriement for BTC postions
                [marginForBTC, netOptionForBTC] = await calcMarginForOneAsset(context, 0, usdcSpot, strikeBTC, isCallBTC, netPositionsBTC, tBTC)
                // console.log("marginForBTC: ", marginForBTC)

            }
            if (netPositionsETH.length > 0) {
                // calc margin requriement for ETH postions
                [marginForETH, netOptionForETH] = await calcMarginForOneAsset(context, 1, usdcSpot, strikeETH, isCallETH, netPositionsETH, tETH)
                // console.log("marginForETH: ", marginForETH)
            }
            if (netPositionsSOL.length > 0) {
                // calc margin requriement for ETH postions
                [marginForSOL, netOptionForSOL] = await calcMarginForOneAsset(context, 3, usdcSpot, strikeSOL, isCallSOL, netPositionsSOL, tSOL)
                // console.log("marginForETH: ", marginForETH)
            }

            // get the total margin
            let margin_requirement = -marginForBTC - marginForETH - marginForSOL
            let netOptionValue = Math.max(netOptionForBTC + netOptionForETH + netOptionForSOL, 0)

            resolve([margin_requirement, netOptionValue])
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
): Promise<[number, number]> {
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

            let netPositionsSOL: number[] = [];
            let tSOL: number[] = [];
            let isCallSOL: number[] = [];
            let strikeSOL: number[] = [];

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
                let maturity = instrument.expiryDate.toNumber()
                if (maturity < new Date().getTime() / 1000) {
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
                } else if (instrument.asset == 3) {
                    netPositionsSOL.push(userNetPositions[i] / (10 ** USDC_DECIMALS))
                    tSOL.push(maturity)
                    strikeSOL.push(instrument.strike.toNumber());
                    isCallSOL.push(Object.keys(instrument.instrumentType)[0] === "call" ? 1 : 0)
                }
            })

            // console.log('tBTC: ', tBTC);
            // console.log('isCallBTC: ', isCallBTC);
            // console.log('strikeBTC: ', strikeBTC);
            // console.log('netPositionsBTC: ', netPositionsBTC);
            // console.log('netPositionsETH: ', netPositionsETH);

            // Calc margin requirement for both BTC and ETH options
            // Calc margin requirement for both BTC and ETH options
            let usdcSpot = await getPythData(context, new PublicKey(PYTH[context.cluster].USDC_USD))
            let marginForBTC = 0
            let marginForETH = 0
            let marginForSOL = 0
            let netOptionForBTC = 0
            let netOptionForETH = 0
            let netOptionForSOL = 0
            if (netPositionsBTC.length > 0) {
                // calc margin requriement for BTC postions
                [marginForBTC, netOptionForBTC] = await calcMarginForOneAsset(context, 0, usdcSpot, strikeBTC, isCallBTC, netPositionsBTC, tBTC)
                console.log("marginForBTC: ", marginForBTC)

            }
            if (netPositionsETH.length > 0) {
                // calc margin requriement for ETH postions
                [marginForETH, netOptionForETH] = await calcMarginForOneAsset(context, 1, usdcSpot, strikeETH, isCallETH, netPositionsETH, tETH)
                console.log("marginForETH: ", marginForETH)
            }

            if (netPositionsSOL.length > 0) {
                // calc margin requriement for SOL postions
                [marginForSOL, netOptionForSOL] = await calcMarginForOneAsset(context, 3, usdcSpot, strikeSOL, isCallSOL, netPositionsSOL, tSOL)
                console.log("marginForSOL: ", marginForSOL)
            }

            // get the total margin
            let margin_requirement = -marginForBTC - marginForETH - marginForSOL
            let netOptionValue = Math.max(netOptionForBTC + netOptionForETH + netOptionForSOL, 0)

            resolve([margin_requirement, netOptionValue])
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
            let [marginRequirement, netOptionValue] = await preCalcMarginForNewOrder(
                context, userAccountAddress, marketAddress, side, maxCoinQty,
            )

            if (userMarginBalance + netOptionValue < marginRequirement) {
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

async function calcMarginForOneAsset(context: Context, asset: number, usdcSpot: number, strikeRaw: number[], isCallRaw: number[], userPositionsRaw: number[], expiryDateRaw: number[]): Promise<[number, number]> {
    let strike = reshap(strikeRaw)

    let tRaw = expiryDateRaw.map((expiryDate) => {
        let maturity = (expiryDate - new Date().getTime() / 1000) / (60 * 60 * 24 * 365)
        if (maturity < 0) {
            maturity = 0
        }
        return maturity
    })

    let t = reshap(tRaw)
    let isCall = reshap(isCallRaw)
    let userPositions = reshap(userPositionsRaw)

    let spotRes = await getSpotPrice(context, asset);
    let spot = spotRes / usdcSpot

    let [iv] = await getGvolIV(0, expiryDateRaw[0])
    iv = iv / 100

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
    let margin = Math.min(margin_result["Total Margin"], 0)
    let net_option_value = margin_result["Total Net Premium Value"]
    return [margin, net_option_value]
}