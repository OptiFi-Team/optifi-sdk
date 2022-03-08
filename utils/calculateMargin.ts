import erf from "math-erf";
import { resourceLimits } from "worker_threads";

// margin_function
export function calculateMargin(user, spot, t, price, intrinsic, stress_price_change) {
    var net_qty1 = net_qty(user);

    var notional_qty1 = notional_qty(user);

    var net = net_qty1 * spot;
    var notional = notional_qty1 * spot;

    var stress_result1 = stress_result(user, stress_price_change);
    var net_intrinsic1 = net_intrinsic(user, intrinsic);
    var net_premium1 = net_premium(user, price);

    var min_t1 = min_t(t);

    var maturing_net_intrinsic1 = maturing_net_intrinsic(user, intrinsic, min_t1);
    var maturing_premium1 = maturing_premium(t, user, price, min_t1);
	var maturing_liquidity1 = maturing_liquidity(t, user, intrinsic, min_t1);

    var margin_11 = margin_1(stress_result1, net_intrinsic1, net_premium1);
	var margin_21 = margin_2(maturing_liquidity1, net_intrinsic1);
	var margin_31 = margin_3(maturing_premium1);
	         
	// total_margin = margin_1 + margin_2 + margin_3
	// net_leverage = net / total_margin
	// notional_leverage = notional / total_margin

    // console.log('margin_11', margin_11)
    // console.log('margin_21', margin_21)
    // console.log('margin_31', margin_31)

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
export function stress_result(user, stress_price_change) {
    console.log('transpose(user)', transpose(user)) // 1x28 array
    console.log('stress_price_change', stress_price_change) // 10*28
    if(stress_price_change[0].constructor === Array) {
        var val1 = [] as any;
        for(let i = 0; i < stress_price_change.length; i++) {
            var val2 = arrmularr(transpose(user)[0], stress_price_change[i]);

            val1.push(Math.min(...val2));
        }

        console.log('val1', val1)

        return val1;
    }
    else {
        var val = matmul(transpose(user), stress_price_change);
        return Math.min.apply(null, val[0]);
    }
}

// net_intrinsic = np.matmul(np.transpose(user), intrinsic).item()
export function net_intrinsic(user, intrinsic) {
    console.log('user_intrinsic', user)
    console.log('intrinsic', intrinsic)
    var val = matmul(transpose(user), intrinsic);

    console.log('val_intrinsic', val)
    console.log('val[0][0]_intrinsic', val[0][0])

    return val[0][0];
}

// net_premium = np.matmul(np.transpose(user), price).item()
export function net_premium(user, price) {
    var val = matmul(transpose(user), price);
    console.log('net_premium_transpose(user)', transpose(user))
    console.log('net_premium_price', price)
    console.log('net_premium_val[0][0]', val[0][0])
    return val[0][0];
}

// min_t = t == np.min(t[t > 0])
export function min_t(t) {
    var result = [] as any;
    for(let i = 0; i < t.length; i++) {
        if(t[i][0] > 0) {
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
    var val = matmul(transpose(matmul(user, min_t)), matmul(intrinsic, min_t));
    console.log('maturing_net_intrinsic user',user)
    console.log('maturing_net_intrinsic intrinsic',intrinsic)
    console.log('maturing_net_intrinsic min_t',min_t)
    console.log('maturing_net_intrinsic val',val)
    return val[0][0];
}

// maturing_premium = np.matmul(np.transpose((2 / (365 * t + 1)) * user * min_t), price * min_t).item()
export function maturing_premium(t, user, price, min_t) {
    console.log('maturing_premium t', t)
    console.log('maturing_premium user', user)
    console.log('maturing_premium price', price)
    console.log('maturing_premium min_t', min_t)

    // confirm formula here too
    var arr = (2 / (365 * t + 1)) * user * min_t;
    var val = matmul(transpose(arr), matmul(price, min_t));
    return val[0][0];
}

// maturing_liquidity = np.matmul(np.transpose((2 / (365 * t + 1)) * user * min_t), intrinsic * min_t).item()
export function maturing_liquidity(t, user, intrinsic, min_t) {
    var arr = (2 / (365 * t + 1)) * user * min_t;
    var val = matmul(transpose(arr), matmul(intrinsic, min_t));
   
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
    // first parameter supposed to be float but stress_spot is array of floats
    // should i consider the parameter can be array too?
	var stress_spot = generate_stress_spot(spot, stress, step);
	var stress_price = option_price(stress_spot, strike, iv, r, q, t, isCall);

    // stress_price_change = stress_price - price
    var stress_price_change = [] as any;
    for(let i = 0; i < stress_price.length; i++) {
        stress_price_change.push(arrminusarr(stress_price[i], price));
    }

	return {
		'Price': price,
		'Regulation T Margin': reg_t_margin,
		'Delta': delta,
		'Intrinsic Value': intrinsic,
		'Stress Spot': stress_spot,
		'Stress Price Delta': stress_price_change
		}
}

export function d1(spot, strike, iv, r, q, t) {
    return arrdivdearr(arrplusarr(arrmul((r - q + iv * iv / 2), t), arrlog(divide(spot, strike))), arrmul(iv, arrsqrt(t)));
}

export function d2(spot, strike, iv, r, q, t) {
    return arrminusarr(d1(spot, strike, iv, r, q, t), (arrmul(iv, arrsqrt(t))));
}

export function option_delta(spot, strike, iv, r, q, t, isCall) {
    var call = cdf(d1(spot, strike, iv, r, q, t));
    var put = minus(call, 1);

    return arrplusarr(arrmularr(call, isCall), arrmularr(minus(1, isCall), put));
}

export function generate_stress_spot(spot, stress, step) {
	var incr1 = incr(stress, step, spot);

    return arrmul(spot, plus((1 - stress), incr1));
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
        result.push((erf(arr[i] / Math.sqrt(2.0)) + 1.0) / 2.0);
    }

    return result;
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
        result.push(Math.sqrt(arr[i]));
    }

    return result;
}

export function arrexp(arr) {
    var result = [] as any;
    for(let i = 0; i < arr.length; i++) {
        result.push(Math.exp(arr[i]));
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
            result.push(Number(a) + Number(b[i])); 
        }
    }
    else {
        for(let i = 0; i < a.length; i++) {
            result.push(Number(a[i]) + Number(b)); 
        }
    }

    return result;
}

export function divide (a, b) {
    var result = [] as any;
    if(typeof a == "number") {
        for(let i = 0; i < b.length; i++) {
            result.push(a / b[i]); 
        }
    }
    else {
        for(let i = 0; i < a.length; i++) {
            result.push(b / a[i]); 
        }
    }

    return result;
}

export function arrmul(a, b) {
    var result = [] as any;

    for(let i = 0; i < b.length; i++) {
        result.push(b[i] * a);
    }

    return result;
}

export function arrmularr (a, b) {
    var result = [] as any;

    for(let i = 0; i < a.length; i++) {
        result.push(a[i] * b[i]);
    }

    return result;
}

export function arrlog(arr) {
    var result = [] as any;

    for(let i = 0; i < arr.length; i++) {
        result.push(Math.log(arr[i]));
    }

    return result;
}

export function arrplusarr(a, b) {
    var result = [] as any;

    for(let i = 0; i < a.length; i++) {
        result.push(a[i] + b[i]);
    }

    return result;
}

export function arrdivdearr(a, b ) {
    var result = [] as any;
    
    for(let i = 0; i < a.length; i++) {
        result.push(a[i] / b[i]);
    }

    return result;
}

export function arrminusarr(a, b) {
    var result = [] as any;

    for(let i = 0; i < a.length; i++) {
        result.push(a[i] - b[i]);
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
        var put = arrplusarr(call, arrminusarr(arrexp(arrmul((-r), t)), arrmul(spot, arrexp(arrmul((-q), t)))));
    
        //return isCall * call + (1 - isCall) * put
        return arrplusarr(arrmularr(isCall, call), arrmularr(minus(1, isCall), put));
    }	
    // spot == array of float
    else {
        var result = [] as any;

        for(let i = 0; i < spot.length; i++) {
            result.push(option_price(spot[i], strike, iv, r, q, t, isCall));
        }

        return result;
    }
}

export function option_reg_t_margin(spot, strike, stress, isCall) {
    // call = (stress * spot - (strike - spot).clip(0)).clip(stress * spot / 2)
	// put = (stress * spot - (spot - strike).clip(0)).clip(stress * spot / 2)
    var call = clip(minus((stress * spot), clip(minus(strike, spot), 0)) ,(stress * spot / 2));
    var put = clip(minus((stress * spot), clip(minus(spot, strike), 0)) ,(stress * spot / 2));

    return arrplusarr(arrmularr(isCall, call), arrmularr(minus(1, isCall), put));
}

// var user = [[1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1]]
// var stress_price_change = [[1,2], [1,2], [1,2], [1,2], [1,2], [1,2], [1,2], [1,2], [1,2], [1,2], [1,2], [1,2], [1,2], [1,2], [1,2], [1,2], [1,2], [1,2], [1,2], [1,2], [1,2], [1,2], [1,2], [1,2], [1,2], [1,2], [1,2], [1,2]]
// var price = [[1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1]]
// var t = [[0.0254814],[0.0254814],[0.0254814],[0.0254814],[0.0254814],[0.0254814],[0.0254814],[0.0254814],[0.0254814],[0.0254814],[0.0254814],[0.0254814],[0.0254814],[0.0254814],[0.0446594],[0.0446594],[0.0446594],[0.0446594],[0.0446594],[0.0446594],[0.0446594],[0.0446594],[0.0446594],[0.0446594],[0.0446594],[0.0446594],[0.0446594],[0.0446594]]
// var intrinsic = [[1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1]]