import * as anchor from "@project-serum/anchor";
import Context from "../types/context";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";
import { Chain, OrderSide } from "../types/optifi-exchange-types";
import { OptifiMarket } from "../types/optifi-exchange-types";
import { findUserAccount } from './accounts'
import { calculateMargin, stress_function, option_intrinsic_value } from "./calculateMargin";
import { getPosition, findOptifiMarkets } from "./market";
import UserPosition from "../types/user";
import { parseAggregatorAccountData } from "@switchboard-xyz/switchboard-api"
import { SWITCHBOARD } from "../constants";

export const r = 0;
export const q = 0;
export const stress = 0.3;

export function calcMarginRequirementForUser(
    context: Context,
    // market: OptifiMarket,
    userAccountAddress: PublicKey,
    // side: OrderSide,
    // limit: number,
    // maxCoinQty: number,
    // maxPcQty: number
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
                    isCallBTC.push(instrument.instrumentType === "call" ? 1 : 0)
                } else if (instrument.asset == 0) {
                    netPositionsETH.push(userNetPositions[i])
                    let maturity = new anchor.BN(new Date().getTime() / 1000).sub(instrument.expiryDate).divn(60 * 60 * 24 * 365).toNumber()
                    tETH.push(maturity)
                    strikeETH.push(instrument.strike.toNumber());
                    isCallETH.push(instrument.instrumentType === "call" ? 1 : 0)
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
                let spot = btcSpot.currentRoundResult?.result! / usdcSpot.currentRoundResult?.result!
                let btcIv = await parseAggregatorAccountData(context.connection, SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_IV)
                let iv = btcIv.currentRoundResult?.result!

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
                let spot = ethSpot.currentRoundResult?.result! / usdcSpot.currentRoundResult?.result!
                let ethIv = await parseAggregatorAccountData(context.connection, SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_IV)
                let iv = ethIv.currentRoundResult?.result!

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