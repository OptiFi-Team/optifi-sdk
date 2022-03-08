import * as assert from "assert";
import erf from "math-erf";
import * as config from "./calcMarginTestData"
import { calculateMargin, stress_function, generate_stress_spot, option_price } from "./calculateMargin"

function reshap(arr: number[]) {

    const newArr: number[][] = [];
    while (arr.length) newArr.push(arr.splice(0, 1));
    return newArr
}

// ##
// ## PARAMS
// ## 

// # SPOT = 48400
// # SPOT_STRESS = 0.3
// # IV = 1.0
// # RATE = 0.0
// # DVD_YLD = 0.0 

let spot = config.SPOT
let r = config.RATE
let q = config.DVD_YLD

// # IV parameter for options. can be used as array
let iv = config.IV

// # stress parameter, current = 30%
let stress = config.SPOT_STRESS

// # option strike collection
// let strike = np.array(config.STRIKE).reshape(-1, 1)
let strike = reshap(config.STRIKE)
// # time to maturities, should be calculated based on system current time and maturity datetime (will require additional function in Rust)
// let t = np.array(config.TIME_TO_MATURITY).reshape(-1, 1)
let t = reshap(config.TIME_TO_MATURITY)

// # indicative array for call or put . Call =1, put =0
// let isCall = np.array(config.IS_CALL).reshape(-1, 1)
let isCall = reshap(config.IS_CALL)
// console.log(strike)
// console.log(t)
// console.log(isCall)

// let user1 = np.array(config.USER_POSITION_1).reshape(-1, 1)
// let user2 = np.array(config.USER_POSITION_2).reshape(-1, 1)
// let user3 = np.array(config.USER_POSITION_3).reshape(-1, 1)

let user1 = reshap(config.USER_POSITION_1)
let user2 = reshap(config.USER_POSITION_2)
let user3 = reshap(config.USER_POSITION_3)



// ##
// ## WORKER
// ##

let stress_results = stress_function(spot, strike, iv, r, q, t, stress, isCall)
// console.log('option_price: ', option_price(spot, strike, iv, r, q, t, isCall))
// console.log("stress_results: ", stress_results)

let generated_stress_spot = generate_stress_spot(10, 0.3, 8)
let price = stress_results['Price']
let intrinsic = stress_results['Intrinsic Value']
let stress_price_change = stress_results['Stress Price Delta']

let margin_results_user1 = calculateMargin(user1, spot, t, price, intrinsic, stress_price_change)
//let margin_results_user2 = calculateMargin(user2, spot, t, price, intrinsic, stress_price_change)
//let margin_results_user3 = calculateMargin(user3, spot, t, price, intrinsic, stress_price_change)

 console.log("margin_results_user1: ", margin_results_user1)



// the following results are from phyton
let expected_margin_results_user1 = {
    'Net Position (QTY)': -2,
    'Total Notional Position (QTY)': 2,
    'Net Position ($)': -96800,
    'Total Notional Position ($)': 96800,
    'Stress Result': -21719.17625053424,
    'Total Net Intrinsic Value': 0,
    'Total Net Premium Value': -6729.576625490066,
    'Maturing Contract Net Intrinsic Value': 0,
    'Maturing Contract Premium Add-on': -557.3180137741404,
    'Maturing Contract Liquidity Add-on': 0.0,
    'Total Margin': -29006.070889798448,
    'Net Leverage': 3.337232414819925,
    'Notional Leverage': -3.337232414819925
}
let expected_margin_results_user2 = {
    'Net Position (QTY)': -2,
    'Total Notional Position (QTY)': 2,
    'Net Position ($)': -96800,
    'Total Notional Position ($)': 96800,
    'Stress Result': -23020.827632274013,
    'Total Net Intrinsic Value': -800,
    'Total Net Premium Value': -7529.57662549007,
    'Maturing Contract Net Intrinsic Value': -400,
    'Maturing Contract Premium Add-on': -634.9825555713045,
    'Maturing Contract Liquidity Add-on': -77.66454179716332,
    'Total Margin': -31185.386813335386,
    'Net Leverage': 3.104017935689248,
    'Notional Leverage': -3.104017935689248
}
let expected_margin_results_user3 = {
    'Net Position (QTY)': -28,
    'Total Notional Position (QTY)': 28,
    'Net Position ($)': -1355200,
    'Total Notional Position ($)': 1355200,
    'Stress Result': -92471.39450137457,
    'Total Net Intrinsic Value': -120800,
    'Total Net Premium Value': -159948.65040708287,
    'Maturing Contract Net Intrinsic Value': -60400,
    'Maturing Contract Premium Add-on': -14618.37112971151,
    'Maturing Contract Liquidity Add-on': -11727.345811371662,
    'Total Margin': -267038.41603816894,
    'Net Leverage': 5.074925248981014,
    'Notional Leverage': -5.074925248981014
}

assert.equal(margin_results_user1, expected_margin_results_user1, "got wrong margin results");
//assert.equal(margin_results_user2, expected_margin_results_user2, "got wrong margin results");
//assert.equal(margin_results_user3, expected_margin_results_user3, "got wrong margin results");

