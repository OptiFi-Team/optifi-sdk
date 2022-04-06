import { pbkdf2 } from "crypto";
import erf from "math-erf";

export function reshap(arr: number[]) {
    const newArr: number[][] = [];
    while (arr.length) newArr.push(arr.splice(0, 1));
    return newArr
}

// margin_function
export function calculateMargin(user, spot, t, price, intrinsic, stress_price_change2) {
    var net_qty1 = net_qty(user);

    var notional_qty1 = notional_qty(user);

    var net = net_qty1 * spot;
    var notional = notional_qty1 * spot;

    var stress_result1 = stress_result(user, stress_price_change2);
    var net_intrinsic1 = net_intrinsic(user, intrinsic);
    var net_premium1 = net_premium(user, price);

    var min_t1 = min_t(t);

    var maturing_net_intrinsic1 = maturing_net_intrinsic(user, intrinsic, min_t1);
    var maturing_premium1 = maturing_premium(t, user, price, min_t1);
	var maturing_liquidity1 = maturing_liquidity(t, user, intrinsic, min_t1);

    var margin_11 = margin_1(stress_result1, net_intrinsic1, net_premium1);
	var margin_21 = margin_2(maturing_liquidity1, net_intrinsic1);
	var margin_31 = margin_3(maturing_premium1);

    var total_margin = margin_11 + margin_31 + margin_21 ;
    var net_leverage = net / total_margin;
    var notional_leverage = notional / total_margin;


    return {
            'Net Position (QTY)': net_qty1,
            'Total Notional Position (QTY)': notional_qty1,
            'Net Position ($)': net,
            'Total Notional Position ($)': notional,
            'Stress Result': stress_result1,
            'Total Net Intrinsic Value': net_intrinsic1,
            'Total Net Premium Value': net_premium1,
            'Maturing Contract Net Intrinsic Value': maturing_net_intrinsic1,
            'Maturing Contract Premium Add-on': maturing_premium1,
            'Maturing Contract Liquidity Add-on': maturing_liquidity1,
            'Total Margin': total_margin,
            'Net Leverage': net_leverage,
            'Notional Leverage': notional_leverage
		}
}

// net_qty = np.sum(user)
export function net_qty(user) {
    var sum = 0;
    for(let i = 0; i < user.length; i++) {
        sum += user[i][0];
    }
    return sum;
}

// notional_qty = np.sum(np.abs(user))
export function notional_qty(user) {
    var sum = 0;
    for (let i = 0; i < user.length; i++) {
        if(user[i] < 0) { sum -= user[i][0]; }
        else { sum += user[i][0]; }
    }
    return sum;
}

// stress_result = np.min(np.matmul(np.transpose(user), stress_price_change))
export function stress_result(user, stress_price_change1) {
    return Math.min(...matmul(transpose(user), stress_price_change1)[0]);
}

// net_intrinsic = np.matmul(np.transpose(user), intrinsic).item()
export function net_intrinsic(user, intrinsic) {
    var val = matmul(transpose(user), intrinsic);
    return val[0][0];
}

// net_premium = np.matmul(np.transpose(user), price).item()
export function net_premium(user, price) {
    var val = matmul(transpose(user), price);
    return val[0][0];
}

// min_t = t == np.min(t[t > 0])
export function min_t(t) {
    var result = [] as any;
    var minimum = 100000;

    for(let i = 0; i < t.length; i++) {
        if(t[i][0] < minimum) {
            minimum = t[i][0]
        }
    }

    for(let i = 0; i < t.length; i++) {
        if(t[i][0] > 0 && t[i][0] === minimum) {
            result.push([true]);
        }
        else {
            result.push([false]);
        }
    }
    return result;
}

// maturing_net_intrinsic = np.matmul(np.transpose(user * min_t), intrinsic * min_t).item()
export function maturing_net_intrinsic(user, intrinsic, min_t) {
    var val = matmul(transpose(arrmularr2(user, min_t)), arrmularr2(intrinsic, min_t));
    return val[0][0];
}

// maturing_premium = np.matmul(np.transpose((2 / (365 * t + 1)) * user * min_t), price * min_t).item()
export function maturing_premium(t, user, price, min_t) {
    var val = matmul(transpose(arrmularr2(arrmularr(arrmul2(365, t), user), min_t)), arrmularr2(price, min_t));
    return val[0][0];
}

// maturing_liquidity = np.matmul(np.transpose((2 / (365 * t + 1)) * user * min_t), intrinsic * min_t).item()
export function maturing_liquidity(t, user, intrinsic, min_t) {
    var val = matmul(transpose(arrmularr2(arrmularr(arrmul2(365, t), user), min_t)), arrmularr2(intrinsic, min_t));
    return val[0][0];
}

// margin_1 = np.min([stress_result + np.min([net_intrinsic, net_premium]), 0])
export function margin_1(stress_result, net_intrinsic, net_premium) {
    if(net_intrinsic > net_premium) {
        if((stress_result + net_premium) > 0) {
            return 0;
        }
        else {
            return stress_result + net_premium;
        }
    }
    else {
        if((stress_result + net_intrinsic) > 0) {
            return 0;
        }
        else {
            return stress_result + net_intrinsic;
        }
    }
}

// margin_2 = maturing_liquidity - net_intrinsic if maturing_liquidity < net_intrinsic and maturing_liquidity < 0 else 0
export function margin_2(maturing_liquidity, net_intrinsic) {
    if(maturing_liquidity < net_intrinsic && maturing_liquidity < 0) {
        return maturing_liquidity - net_intrinsic;
    }
    else {
        return 0;
    }
}

// margin_3 = maturing_premium if maturing_premium < 0 else 0
export function margin_3(maturing_premium) {
    if(maturing_premium < 0) { return maturing_premium; }
    else { return 0; }
}

// np.transpose
export function transpose(arr) {
    const result = [] as any;
    for(let i = 0; i < arr.length; i++) {
        result.push(arr[i][0]);
    }
    return [result];
}

// np.matmul
export function matmul(a, b) {
    var aRow = a.length;
    var aCol = a[0].length;
    var bCol = b[0].length;

    var m = new Array(aRow);

    for(let i = 0; i < aRow; i++) {
        m[i] = new Array(bCol);

        for(let j = 0; j < bCol; j++) {
            m[i][j] = 0;
            for (let k = 0; k < aCol; k++) {
                m[i][j] += a[i][k] * b[k][j];
            }
        }
    }

    return m;
}

// stress_function
export function stress_function(spot, strike, iv, r, q, t, stress, isCall, step = 5) {
    // main values: prices, reg-t margins, delta, intrinsic values
	var price = option_price(spot, strike, iv, r, q, t, isCall);
	var reg_t_margin = option_reg_t_margin(spot, strike, stress, isCall);
	var delta = option_delta(spot, strike, iv, r, q, t, isCall);
	var intrinsic = option_intrinsic_value(spot, strike, isCall);
	
	// stresses
	var stress_spot = generate_stress_spot(spot, stress, step);
	var stress_price = option_price(stress_spot, strike, iv, r, q, t, isCall);
    var stress_price_change1 = stress_price_change(stress_price, price);

	return {
		'Price': price,
		'Regulation T Margin': reg_t_margin,
		'Delta': delta,
		'Intrinsic Value': intrinsic,
		'Stress Spot': stress_spot,
		'Stress Price Delta': stress_price_change1
		}
}

export function stress_price_change(stress_price, price) {
    var result = [] as any;
    for(let i = 0; i < stress_price.length; i++) {
        result.push(arrminusarr1(stress_price[i], price[i][0]));
    }

    return result;
}

// d1=(log(S/X[np])+(r-q+sigma**2/2.)*T)/(sigma*sqrt(T))
export function d1(spot, strike, iv, r, q, t) {
    return arrdivdearr(arrplusarr(arrmul((r - q + iv * iv / 2), t), arrlog(divide(spot, strike))), arrmul(iv, arrsqrt(t)));
}

export function d2(spot, strike, iv, r, q, t) {
    return arrminusarr(d1(spot, strike, iv, r, q, t), (arrmul(iv, arrsqrt(t))));
}


export function option_delta(spot, strike, iv, r, q, t, isCall) {
    
    var call = cdf(d1(spot, strike, iv, r, q, t));
    var put = minus(call, 1);

    // console.log('call: ', call)
    // console.log('put: ', put)

    return arrplusarr(arrmularr(call, isCall), arrmularr(minus(1, isCall), put));
}

export function generate_stress_spot(spot, stress, step) {
	var incr1 = incr(stress, step, spot);

    return arrmul1(spot, plus((1 - stress), incr1));
}

export function incr(stress, step, spot) {
    var result = [] as any;
    for(let i = 0; i < (step * 2 + 1); i++) {
        result.push([stress / step * i]);
    }

    return result;
}

export function cdf(arr) {
    var result = [] as any;

    for(let i = 0; i < arr.length; i++) {
        result.push([Math.round((erf(arr[i] / Math.sqrt(2.0)) + 1.0) / 2.0 * 100000000) / 100000000]);
    }

    return result;
}

export function cdf_num(num) {
    return (erf(num / Math.sqrt(2.0)) + 1.0) / 2.0;
}

export function pdf(arr, s) {
    var result = [] as any;

    for(let i = 0; i < arr.length; i++) {
        var val = s * Math.exp((-arr[i][0]) * (-arr[i][0]) / 2) / Math.sqrt(2*Math.PI);
        result.push([val])
    }

    return result;
}

//var PriceError = S*Math.exp(-q*T)*nd1-X[np]*Math.exp(-r*T)*nd2-P[np];
export function priceErrorCalc(S, q, T, nd1, x, r, nd2, p) {
    let PriceError = arrmul(S, arrmularr(Math.exp(arrmul((-q), T)), nd1)) 
                    - arrmul(arrmularr(arrmul((-r), T),nd2), x[0]) - p[0]
    return PriceError;
}

//var Vega = S*Math.sqrt(T)*Math.exp(-q*T)*npd1;
export function vegaCalc(S, T, q, npd1) {
    // console.log('vega1: ', arrmul(S, arrsqrt(T)))
    // console.log('vega2: ', arrmularr(arrexp(arrmul((-q), T)), npd1))
    // console.log('Vega params: ')
    // console.log('S', S)
    // console.log('T', T)
    // console.log('q', q)
    // console.log('npd1', npd1)
    let vega = arrmularr(arrmul(S, arrsqrt(T)), arrmularr(arrexp(arrmul((-q), T)), npd1))
    return vega;
}

export function clip(arr, x) {
    var result = [] as any;
    for(let i = 0; i < arr.length; i++) {
        if(arr[i] < x) {
            result.push(x);
        }
        else{
            result.push(arr[i]);
        }
    }
    return result;
}

export function arrsqrt(arr) {
    var result = [] as any;
    for(let i = 0; i < arr.length; i++) {
        result.push([Math.sqrt(arr[i])]);
    }

    return result;
}

export function arrexp(arr) {
    var result = [] as any;
    for(let i = 0; i < arr.length; i++) {
        result.push([Math.exp(arr[i])]);
    }

    return result;
}

export function minus (a, b) {
    var result = [] as any;
    if(typeof a == "number") {
        for(let i = 0; i < b.length; i++) {
            result.push(Number(a) - Number(b[i])); 
        }
    }
    else {
        for(let i = 0; i < a.length; i++) {
            result.push(Number(a[i]) - Number(b));  
        }
    }

    return result;
}

export function plus (a, b) {
    var result = [] as any;
    if(typeof a == "number") {
        for(let i = 0; i < b.length; i++) {
            result.push(Math.round(((Number(a) + Number(b[i])) * 100)) / 100); 
        }
    }
    else {
        for(let i = 0; i < a.length; i++) {
            result.push(Math.round(((Number(a[i]) + Number(b)) * 100)) / 100); 
        }
    }

    return [result];
}

export function divide (a, b) {
    var result = [] as any;
    if(typeof a == "number") {
        for(let i = 0; i < b.length; i++) {
            result.push([Math.floor(a / b[i])]); 
        }
    }
    else {
        for(let i = 0; i < a.length; i++) {
            result.push([Math.floor(b / a[i])]); 
        }
    }

    return result;
}

export function arrmul(a, b) {
    var result = [] as any;

    for(let i = 0; i < b.length; i++) {
        result.push([b[i][0] * a]);
    }

    return result;
}

export function arrmul1(a, b) {
    var result = [] as any;

    for(let i = 0; i < b[0].length; i++) {
        result.push(b[0][i] * a);
    }

    return [result];
}

export function arrmul2(a, b) {
    var result = [] as any;

    for(let i = 0; i < b.length; i++) {
        result.push([2 / (b[i][0] * a + 1)]);
    }

    return result;
}

export function arrmularr (a, b) {
    var result = [] as any;

    for(let i = 0; i < a.length; i++) {
        result.push([a[i] * b[i]]);
    }

    return result;
}

export function arrmularr2 (a, b) {
    var result = [] as any;

    for(let i = 0; i < a.length; i++) {
        if(b[i][0]) {
            result.push([a[i][0]]);
        }
        else {
            result.push([0]);
        }
    }

    return result;
}

export function arrmularr1 (a, b) {
    var result = [] as any;

    for(let i = 0; i < b.length; i++) {
        var result1 = [] as any;
        var val = b[i][0];
        for(let j = 0; j < a[0].length; j++) {
            result1.push(a[0][j] * val);
        }
        result.push(result1);
    }

    return result;
}

export function arrlog(arr) {
    var result = [] as any;

    for(let i = 0; i < arr.length; i++) {
        result.push([Math.log(arr[i])]);
    }

    return result;
}

export function arrplusarr(a, b) {
    var result = [] as any;

    for(let i = 0; i < a.length; i++) {
        result.push([Number(a[i]) + Number(b[i])]);
    }

    return result;
}

export function arrdivdearr(a, b ) {
    var result = [] as any;
    for(let i = 0; i < a.length; i++) {
        result.push([Math.round(a[i] / b[i] * 100000000) / 100000000]);
    }

    return result;
}

export function arrminusarr(a, b) {
    var result = [] as any;

    for(let i = 0; i < a.length; i++) {
        result.push([a[i] - b[i]]);
    }

    return result;
}

export function arrminusarr1(a, b) {
    var result = [] as any;


    for(let j = 0; j < a.length; j++) {
        result.push(a[j] - b);
    }
    
    return result;
}


export function option_intrinsic_value(spot, strike, isCall) {
    // call = (spot - strike).clip(0)
	// put = (strike - spot).clip(0)
    var call = clip(minus(spot, strike), 0);
    var put = clip(minus(strike, spot), 0);

    // return isCall * call + (1 - isCall) * put
    return arrplusarr(arrmularr(isCall, call), arrmularr(minus(1, isCall), put));
}

export function option_price(spot, strike, iv, r, q, t, isCall) {
    if(typeof spot == "number") {
        var call = arrminusarr(arrmularr(arrmul(spot, arrexp(arrmul(((-q)), t))), cdf(d1(spot, strike, iv, r, q, t))), arrmularr(strike, arrmularr(arrexp(arrmul((-r), t)), cdf(d2(spot, strike, iv, r, q, t)))));
        // put = call + strike * np.exp(-r * t) - spot * np.exp(-q * t)
        var put = arrplusarr(call, arrminusarr(arrmularr(strike, arrexp(arrmul((-r), t))), arrmul(spot, arrexp(arrmul((-q), t)))));
        
        return arrplusarr(arrmularr(isCall, call), arrmularr(minus(1, isCall), put));
    }
    else {
        // spot == stress_spot == [[ 33880,  36784,  39688,  42592,  45496,  48400,  51304, 54208,  57112,  60016,  62920]]
        var call = [] as any;
        var put = [] as any;
        var result = [] as any;

        for(let i = 0; i < strike.length; i++) {
            // stress_spot / strike
            var div_stress_spot = [] as any;
            for(let j = 0; j < spot[0].length; j++) {
                div_stress_spot.push(Math.log(spot[0][j] / strike[i]));
            }
            call.push(div_stress_spot);
            put.push(div_stress_spot);
            result.push(div_stress_spot);
        }

        var val1 = arrmul((r - q + iv * iv / 2), t);
        var val2 = arrmul(iv, arrsqrt(t));

        // np.exp(-q * t)
        var val3 = arrexp(arrmul(((-q)), t));
        // np.exp(-r * t)
        var val4 = arrexp(arrmul(((-r)), t));

        // get call
        for(let i = 0; i < call.length; i++) { //28
            for(let j = 0; j < call[0].length; j++) { // 11
                // call value
                call[i][j] += val1[i][0];
                call[i][j] = spot[0][j] * val3[i][0] * cdf_num(call[i][j] / val2[i][0]) - strike[i][0] * val4[i][0] * cdf_num(call[i][j] / val2[i][0] - val2[i][0]);
                
                // put value
                put[i][j] = call[i][j] + strike[i][0] * val4[i][0] - spot[0][j] * val4[i][0];

                result[i][j] = isCall[i][0] * call[i][j] + (1 - isCall[i][0]) * put[i][j];
            }
        }

        return result;
    }
}

export function option_reg_t_margin(spot, strike, stress, isCall) {
    var call = clip(minus((stress * spot), clip(minus(strike, spot), 0)) ,(stress * spot / 2));
    var put = clip(minus((stress * spot), clip(minus(spot, strike), 0)) ,(stress * spot / 2));
    return arrplusarr(arrmularr(isCall, call), arrmularr(minus(1, isCall), put));
}

export function imp_vol_call(spot, strike, price, r, q, t) {
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

    if(NC === NX) {
        var ff: number[] = [];

        for(let nc = 0 ; nc < NC; nc++) {
            var sigma = 0.3;
            var error = 0.0000001;

            var dv = error + 1;
            var tic = (new Date()).getTime() / 1000;

            while(Math.abs(dv) > error) {

                var d1_val = (Math.log(S / X[nc][0]) + (r - q + sigma**2/2.)*(T[nc][0])) / (sigma*Math.sqrt(T[nc][0]));
                var d2_val = d1_val - sigma*Math.sqrt(T[nc]);
                // [Math.round((erf(arr[i] / Math.sqrt(2.0)) + 1.0) / 2.0 * 100000000) / 100000000]
                var nd1 = Math.round((erf(d1_val / Math.sqrt(2.0)) + 1.0) / 2.0 * 100000000) / 100000000;
                var nd2 = Math.round((erf(d2_val / Math.sqrt(2.0)) + 1.0) / 2.0 * 100000000) / 100000000;

                var npd1 = Math.exp((-d1_val)**2/2) / Math.sqrt(2*Math.PI);

                var PriceError = S*Math.exp(-q*(T[nc]))*nd1-X[nc]*Math.exp(-r*(T[nc]))*nd2-C[nc];
                var Vega = S*Math.sqrt(T[nc])*Math.exp(-q*(T[nc]))*npd1;

                if(Vega === 0 ) {   // 
                    console.log('No Volatility can be found');
                    sigma = NaN;
                    break;
                }

                var dv = PriceError/Vega;
                sigma = sigma - dv;
                var time2 = (new Date()).getTime() / 1000 - tic;

                // console.log('dv: ', dv)

                if(time2 > 60) {
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

export function imp_vol_put(spot, strike, price, r, q, t) {
    // console.log(`imp_vol_put function's params: `, spot, strike, price, r, q, t)
    var P = price;
    var S = spot;
    var X = strike;
    var T = t;

    var NP = P.length;
    var NX = X.length;

    if(NP === NX) {
        var ff: number[] = [];

        for(let np = 0 ; np < NP; np++) {
            var sigma = 0.3;
            var error = 0.0000001;

            var dv = error + 1;
            var tic = (new Date()).getTime() / 1000;

            while(Math.abs(dv) > error) {
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


                var d1_val = (Math.log(S / X[np][0]) + (r - q + sigma**2/2.)*(T[np][0])) / (sigma*Math.sqrt(T[np][0]));
                var d2_val = d1_val - sigma*Math.sqrt(T[np]);
                // [Math.round((erf(arr[i] / Math.sqrt(2.0)) + 1.0) / 2.0 * 100000000) / 100000000]
                var nd1 = Math.round((erf(d1_val / Math.sqrt(2.0)) + 1.0) / 2.0 * 100000000) / 100000000;
                var nd2 = Math.round((erf(d2_val / Math.sqrt(2.0)) + 1.0) / 2.0 * 100000000) / 100000000;

                var npd1 = Math.exp((-d1_val)**2/2) / Math.sqrt(2*Math.PI);

                //PriceError=-S*exp(-q*T)*nd1+X[np]*exp(-r*T)*nd2-P[np]
				// Vega=S*sqrt(T)*exp(-q*T)*npd1
                var PriceError = S*Math.exp(-q*(T[np]))*nd1-X[np]*Math.exp(-r*(T[np]))*nd2-P[np];
                var Vega = S*Math.sqrt(T[np])*Math.exp(-q*(T[np]))*npd1;

                // console.log('d1_val: ', d1_val)
                // console.log('d2_val: ', d2_val)
                // console.log('nd1: ', nd1)
                // console.log('nd2: ', nd2)
                // console.log('npd1: ', npd1)
                // console.log('PriceErr: ', PriceError)
                // console.log('Vega: ', Vega)

                if(Vega === 0 ) {   // 
                    console.log('No Volatility can be found');
                    sigma = NaN;
                    break;
                }

                var dv = PriceError/Vega;
                sigma = sigma - dv;
                var time2 = (new Date()).getTime() / 1000 - tic;

                // console.log('dv: ', dv)

                if(time2 > 60) {
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