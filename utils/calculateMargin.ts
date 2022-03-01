
export default function calculateMargin(context: Context,
    ammAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {

    })
}

// net_qty = np.sum(user)
function net_qty(user) {
    return user.reduce((a, b) => a + b, 0);
}

// notional_qty = np.sum(np.abs(user))
function notional_qty(user) {
    var sum = 0;
    for (let i = 0; i < user.length; i++) {
        if(user[i] < 0) { sum -= user[i]; }
        else { sum += user[i]; }
    }
    return sum;
}
// stress_result = np.min(np.matmul(np.transpose(user), stress_price_change))
function stress_result(user, stress_price_change) {

}

// net_intrinsic = np.matmul(np.transpose(user), intrinsic).item()
function net_intrinsic(user, intrinsic) {

}

// net_premium = np.matmul(np.transpose(user), price).item()
function net_premium(user, price) {

}

// min_t = t == np.min(t[t > 0])
function min_t(t) {

}

// maturing_net_intrinsic = np.matmul(np.transpose(user * min_t), intrinsic * min_t).item()
function maturing_net_intrinsic(user, intrinsic, min_t) {
    
}

// maturing_premium = np.matmul(np.transpose((2 / (365 * t + 1)) * user * min_t), price * min_t).item()
function maturing_premium(t, user, price, min_t) {
    
}

// maturing_liquidity = np.matmul(np.transpose((2 / (365 * t + 1)) * user * min_t), intrinsic * min_t).item()
function maturing_liquidity(t, user, intrinsic, min_t) {

}

// margin_1 = np.min([stress_result + np.min([net_intrinsic, net_premium]), 0])
function margin_1(stress_result, net_intrinsic, net_premium) {
    
}

// margin_2 = maturing_liquidity - net_intrinsic if maturing_liquidity < net_intrinsic and maturing_liquidity < 0 else 0
function margin_2(maturing_liquidity, net_intrinsic) {
    if(maturing_liquidity < net_intrinsic && maturing_liquidity < 0) {
        return maturing_liquidity - net_intrinsic;
    }
    else {
        return 0;
    }
}

// margin_3 = maturing_premium if maturing_premium < 0 else 0
function margin_3(maturing_premium) {
    if(maturing_premium < 0) { return maturing_premium; }
    else { return 0; }
}

function marginCalculator(user, spot, t, price, intrinsic, stress_price_change) {
    var net_qty1 = net_qty(user);

    var notional_qty1 = notional_qty(user);

    var net = net_qty1 * spot;
    var notional = notional_qty1 * spot;

    var stress_result = stress_result(user, stress_price_change);
    var net_intrinsic = net_intrinsic(user, intrinsic);
    var net_premium = net_premium(user, price);

    var min_t = min_t(t);

    var maturing_net_intrinsic = maturing_net_intrinsic(user, intrinsic, min_t);
    var maturing_premium = maturing_premium(t, user, price, min_t);
	var maturing_liquidity = maturing_liquidity(t, user, intrinsic, min_t);

    var margin_1 = margin_1(stress_result, net_intrinsic, net_premium);
	var margin_2 = margin_2(maturing_liquidity, net_intrinsic);
	var margin_3 = margin_3(maturing_premium);
	
	// total_margin = margin_1 + margin_2 + margin_3
	// net_leverage = net / total_margin
	// notional_leverage = notional / total_margin
    var total_margin = margin_1 + margin_2 + margin_3;
    var net_leverage = net / total_margin;
    var notional_leverage = notional / total_margin;

    return {
            'Net Position (QTY)': net_qty,
            'Total Notional Position (QTY)': notional_qty,
            'Net Position ($)': net,
            'Total Notional Position ($)': notional,
            'Stress Result': stress_result,
            'Total Net Intrinsic Value': net_intrinsic,
            'Total Net Premium Value': net_premium,
            'Maturing Contract Net Intrinsic Value': maturing_net_intrinsic,
            'Maturing Contract Premium Add-on': maturing_premium,
            'Maturing Contract Liquidity Add-on': maturing_liquidity,
            'Total Margin': total_margin,
            'Net Leverage': net_leverage,
            'Notional Leverage': notional_leverage
		}
}