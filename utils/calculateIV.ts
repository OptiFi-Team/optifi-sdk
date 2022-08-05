import Context from "../types/context";
import { OptifiMarketFullData } from "./market"
import { PublicKey } from "@solana/web3.js";
import { PYTH, SWITCHBOARD } from "../constants";
import erf from "math-erf";
import { getSwitchboard } from "./switchboardV2";
import { getPythData } from "./pyth";

export const r = 0;
export const q = 0;

interface IVResult {
    ask: number,
    bid: number
}

function reshap(arr: number[]) {

    const newArr: number[][] = [];
    let arr_mod = arr;
    while (arr_mod.length) newArr.push(arr_mod.splice(0, 1));
    return newArr
}

export function calculateIV(
    context: Context,
    optifiMarket: OptifiMarketFullData[]
): Promise<IVResult[]> {
    return new Promise(async (resolve, reject) => {
        try {
            // get Spot price too just like optionDeltafunction
            let spotRes_btc = await getPythData(context, new PublicKey(PYTH[context.cluster].BTC_USD))
            let spotRes_eth = await getPythData(context, new PublicKey(PYTH[context.cluster].ETH_USD))
            let usdcSpot = await getPythData(context, new PublicKey(PYTH[context.cluster].USDC_USD))
            let spot_btc = Math.round(spotRes_btc / usdcSpot * 100) / 100
            let spot_eth = Math.round(spotRes_eth / usdcSpot * 100) / 100

            let today = new Date().getTime();

            let res = optifiMarket.map(market => {
                let spot: number;
                switch (market.asset) {
                    case "BTC":
                        spot = spot_btc
                        break
                    case "ETH":
                        spot = spot_eth
                        break
                }
                // update decimal
                let t = (market.expiryDate.getTime() / 1000 - today / 1000) / (60 * 60 * 24 * 365);
                t = (Math.round(t * 10000) / 10000)
                let ivBid: number | number[];
                let ivAsk: number | number[];
                let isCall = market.instrumentType === "Call" ? 1 : 0

                if (isCall) {
                    ivBid = impVolCall(spot, reshap([market.strike]), reshap([market.bidPrice]), r, q, reshap([t]))
                    ivAsk = impVolCall(spot, reshap([market.strike]), reshap([market.askPrice]), r, q, reshap([t]))
                } else {
                    ivBid = impVolPut(spot, reshap([market.strike]), reshap([market.bidPrice]), r, q, reshap([t]))
                    ivAsk = impVolPut(spot, reshap([market.strike]), reshap([market.askPrice]), r, q, reshap([t]))
                }

                let temp: IVResult = {
                    ask: ivAsk[0],
                    bid: ivBid[0]
                }
                return temp
            })

            resolve(res)

        }
        catch (err) {
            reject(err);
        }
    })
}


export function impVolCall(spot, strike, price, r, q, t) {
    var C = price;
    var S = spot;
    var X = strike;
    var T = t;

    var NC = C.length;
    var NX = X.length;

    // console.log('C: ', C)
    // console.log('S: ', S)
    // console.log('X: ', X)
    // console.log('T: ', T)

    if (NC === NX) {
        var ff: number[] = [];

        for (let nc = 0; nc < NC; nc++) {
            var sigma = 0.6;
            var error = 0.00001;

            var dv = error + 1;
            var tic = (new Date()).getTime() / 1000;

            while (Math.abs(dv) > error || sigma >= 5.0) {

                var d1_val = (Math.log(S / X[nc][0]) + (r - q + sigma ** 2 / 2.) * (T[nc][0])) / (sigma * Math.sqrt(T[nc][0]));
                var d2_val = d1_val - sigma * Math.sqrt(T[nc]);
                // [Math.round((erf(arr[i] / Math.sqrt(2.0)) + 1.0) / 2.0 * 100000000) / 100000000]
                var nd1 = erf((d1_val) / Math.sqrt(2.0)) * 0.5 + 0.5;
                var nd2 = erf((d2_val) / Math.sqrt(2.0)) * 0.5 + 0.5;

                var npd1 = Math.exp((d1_val) ** 2 / 2) / Math.sqrt(2 * Math.PI);

                var PriceError = S * Math.exp(-q * (T[nc])) * nd1 - X[nc] * Math.exp(-r * (T[nc])) * nd2 - C[nc];
                var Vega = S * Math.sqrt(T[nc]) * Math.exp(-q * (T[nc])) * npd1;

                if (Vega === 0) {   // 
                    console.log('No Volatility can be found');
                    sigma = NaN;
                    break;
                }

                var dv = PriceError / Vega;
                sigma = sigma - dv;
                var time2 = (new Date()).getTime() / 1000 - tic;

                if (sigma > 5) {
                    sigma = 5;
                    break;
                }
                // console.log('dv: ', dv)

                if (time2 > 60) {
                    console.log('the routine did not converge within 60 seconds')
                    sigma = NaN;
                    break;
                }
            }
            ff.push(sigma);
        }
        return ff;
    }
    else {
        console.log('P and X are not of equal size')
        console.log('P', C)
        console.log('X', X)
        return NaN;
    }
}

export function impVolPut(spot, strike, price, r, q, t) {
    var P = price;
    var S = spot;
    var X = strike;
    var T = t;

    var NP = P.length;
    var NX = X.length;

    if (NP === NX) {
        var ff: number[] = [];

        for (let np = 0; np < NP; np++) {
            var sigma = 0.6;
            var error = 0.00001;

            var dv = error + 1;
            var tic = (new Date()).getTime() / 1000;

            while ((Math.abs(dv) > error) || (sigma >= 5.0)) {
                var d1_val = (Math.log(S / X[np][0]) + (r - q + sigma ** 2 / 2.) * (T[np][0])) / (sigma * Math.sqrt(T[np][0]));
                // console.log('d1_val: ', d1_val)

                var d2_val = d1_val - sigma * Math.sqrt(T[np]);
                // console.log('d2_val: ', d2_val)

                // result.push([Math.round((erf(arr[i] / Math.sqrt(2.0)) + 1.0) / 2.0 * 100000000) / 100000000]);

                // [Math.round((erf(arr[i] / Math.sqrt(2.0)) + 1.0) / 2.0 * 100000000) / 100000000]
                // erf(x / SQRT_2) * 0.5 + 0.5
                var nd1 = erf((-d1_val) / Math.sqrt(2.0)) * 0.5 + 0.5;
                var nd2 = erf((-d2_val) / Math.sqrt(2.0)) * 0.5 + 0.5;

                // norm.pdf(x) = exp(-x**2/2)/sqrt(2*pi)
                var npd1 = Math.exp(-(d1_val ** 2) / 2) / Math.sqrt(2 * Math.PI);
                // console.log('nd1: ', nd1)
                // console.log('nd2: ', nd2)
                // console.log('npd1: ', npd1)

                //PriceError=-S*exp(-q*T)*nd1+X[np]*exp(-r*T)*nd2-P[np]
                // Vega=S*sqrt(T)*exp(-q*T)*npd1
                var PriceError = (-S) * Math.exp(-q * (T[np])) * nd1 + X[np] * Math.exp(-r * (T[np])) * nd2 - P[np];
                var Vega = S * Math.sqrt(T[np]) * Math.exp(-q * (T[np])) * npd1;

                // console.log('nd1: ', nd1)
                // console.log('nd2: ', nd2)
                // console.log('q: ', q)
                // console.log('r: ', r)
                // console.log('T[np]: ', T[np])
                // console.log('X[np]: ', X[np])
                // console.log('P[np]: ', P[np])
                // console.log('PriceErr: ', PriceError)
                // console.log('Vega: ', Vega)

                if (Vega === 0) {   // 
                    console.log('No Volatility can be found');
                    sigma = NaN;
                    break;
                }

                var dv = PriceError / Vega;
                sigma = sigma - dv;
                var time2 = ((new Date()).getTime() / 1000) - tic;

                // console.log('dv: ', dv)
                // console.log('sigma: ', sigma)

                // console.log('tic: ', tic)
                // console.log('time2: ', time2)

                if (sigma > 5) {
                    sigma = 5;
                    break;
                }

                if (time2 > 60) {
                    console.log('the routine did not converge within 60 seconds')
                    sigma = NaN;
                    break;
                }
                // console.log('------------------')
            }
            ff.push(sigma);
        }
        return ff;
    }
    else {
        // console.log('P and X are not of equal size')
        // console.log('P', P)
        // console.log('X', X)
        return NaN;
    }
}

// console.log(imp_vol_put([41000], [[35000]], [[1000]], 0, 0, [[0.0027397260273972603]]))
// console.log(imp_vol_put(41000, [[35000]], [[1000]], 0, 0, [[0.0027397260273972603]]))

// norm.pdf(x) = exp(-x**2/2)/sqrt(2*pi)
// console.log(Math.exp(-(3 ** 2) / 2) / Math.sqrt(2 * Math.PI))


export function imp_vol_call_v1(spot, strike, price, r, q, t) {
    var C = price;
    var S = spot;
    var X = strike;
    var T = t;

    var NC = C.length;
    var NX = X.length;

    // console.log('C: ', C)
    // console.log('S: ', S)
    // console.log('X: ', X)
    // console.log('T: ', T)

    if (NC === NX) {
        var ff: number[] = [];

        for (let nc = 0; nc < NC; nc++) {
            var sigma = 0.3;
            var error = 0.00001;

            var dv = error + 1;
            var tic = (new Date()).getTime() / 1000;

            while (Math.abs(dv) > error) {

                var d1_val = (Math.log(S / X[nc][0]) + (r - q + sigma ** 2 / 2.) * (T[nc][0])) / (sigma * Math.sqrt(T[nc][0]));
                var d2_val = d1_val - sigma * Math.sqrt(T[nc]);
                // [Math.round((erf(arr[i] / Math.sqrt(2.0)) + 1.0) / 2.0 * 100000000) / 100000000]
                var nd1 = Math.round((erf(d1_val / Math.sqrt(2.0)) + 1.0) / 2.0 * 100000000) / 100000000;
                var nd2 = Math.round((erf(d2_val / Math.sqrt(2.0)) + 1.0) / 2.0 * 100000000) / 100000000;

                var npd1 = Math.exp((-d1_val) ** 2 / 2) / Math.sqrt(2 * Math.PI);

                var PriceError = S * Math.exp(-q * (T[nc])) * nd1 - X[nc] * Math.exp(-r * (T[nc])) * nd2 - C[nc];
                var Vega = S * Math.sqrt(T[nc]) * Math.exp(-q * (T[nc])) * npd1;

                if (Vega === 0) {   // 
                    console.log('No Volatility can be found');
                    sigma = NaN;
                    break;
                }

                var dv = PriceError / Vega;
                sigma = sigma - dv;
                var time2 = (new Date()).getTime() / 1000 - tic;

                // console.log('dv: ', dv)

                if (time2 > 60) {
                    console.log('the routine did not converge within 60 seconds')
                    sigma = NaN;
                    break;
                }
            }
            ff.push(sigma);
        }
        return ff;
    }
    else {
        console.log('P and X are not of equal size')
        console.log('P', C)
        console.log('X', X)
        return NaN;
    }
}

export function imp_vol_put_v1(spot, strike, price, r, q, t) {
    // console.log(`imp_vol_put function's params: `, spot, strike, price, r, q, t)
    var P = price;
    var S = spot;
    var X = strike;
    var T = t;

    var NP = P.length;
    var NX = X.length;

    if (NP === NX) {
        var ff: number[] = [];

        for (let np = 0; np < NP; np++) {
            var sigma = 0.3;
            var error = 0.00001;

            var dv = error + 1;
            var tic = (new Date()).getTime() / 1000;

            while (Math.abs(dv) > error) {
                // console.log('Math.abs(dv): ', Math.abs(dv))
                // console.log('error: ', error)
                // d1=(log(S/X[np])+(r-q+sigma**2/2.)*T[np])/(sigma*sqrt(T[np]))

                // d2= d1-sigma*sqrt(T)
                // nd1= nm.cdf(-d1)
                // nd2= nm.cdf(-d2)
                // npd1= nm.pdf(d1)
                // var d1_val = d1(S, X, sigma, r, q, T);
                // console.log(`-----------------------${np}`)
                // console.log('S:',S)
                // console.log('X[np]:',X[np][0])
                // console.log('r:',r)
                // console.log('q:',q)
                // console.log('sigma:',sigma)
                // console.log('T[np]:',T[np][0])


                var d1_val = (Math.log(S / X[np][0]) + (r - q + sigma ** 2 / 2.) * (T[np][0])) / (sigma * Math.sqrt(T[np][0]));
                var d2_val = d1_val - sigma * Math.sqrt(T[np]);
                // [Math.round((erf(arr[i] / Math.sqrt(2.0)) + 1.0) / 2.0 * 100000000) / 100000000]
                var nd1 = Math.round((erf(d1_val / Math.sqrt(2.0)) + 1.0) / 2.0 * 100000000) / 100000000;
                var nd2 = Math.round((erf(d2_val / Math.sqrt(2.0)) + 1.0) / 2.0 * 100000000) / 100000000;

                var npd1 = Math.exp((-d1_val) ** 2 / 2) / Math.sqrt(2 * Math.PI);

                //PriceError=-S*exp(-q*T)*nd1+X[np]*exp(-r*T)*nd2-P[np]
                // Vega=S*sqrt(T)*exp(-q*T)*npd1
                var PriceError = S * Math.exp(-q * (T[np])) * nd1 - X[np] * Math.exp(-r * (T[np])) * nd2 - P[np];
                var Vega = S * Math.sqrt(T[np]) * Math.exp(-q * (T[np])) * npd1;

                // console.log('d1_val: ', d1_val)
                // console.log('d2_val: ', d2_val)
                // console.log('nd1: ', nd1)
                // console.log('nd2: ', nd2)
                // console.log('npd1: ', npd1)
                // console.log('PriceErr: ', PriceError)
                // console.log('Vega: ', Vega)

                if (Vega === 0) {   // 
                    console.log('No Volatility can be found');
                    sigma = NaN;
                    break;
                }

                var dv = PriceError / Vega;
                sigma = sigma - dv;
                var time2 = (new Date()).getTime() / 1000 - tic;

                // console.log('dv: ', dv)

                if (time2 > 60) {
                    console.log('the routine did not converge within 60 seconds')
                    sigma = NaN;
                    break;
                }
            }
            ff.push(sigma);
        }
        return ff;
    }
    else {
        console.log('P and X are not of equal size')
        console.log('P', P)
        console.log('X', X)
        return NaN;
    }
}