import { ndf, d2, reshap } from "../utils/calculateMargin"

const BREAK_EVEN = [
    41000 + 900.92,
    39000 - 870.96,
    40000 + 1327,
    40000 - 1327,
    42000 + 587.81,
]
const TIME_TO_MATURITY = [
    0.019178,
    0.01923,
    0.01923,
    0.01923,
    0.01923,
]

let spot = 40000;
let break_even = reshap(BREAK_EVEN);
let iv = 0.6;
let r = 0;
let q = 0;
let t = reshap(TIME_TO_MATURITY);

let d2_result = d2(spot, break_even, iv, r, q, t)

//execpt output:[-0.6003,0.5341,-0.434,0.364,-0.795]
//console.log(d2_result);

let ndf_result = ndf(d2_result);
console.log(ndf_result);