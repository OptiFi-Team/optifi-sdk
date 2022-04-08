
import { initializeContext } from "../index";
import { calcNDF } from "../utils/calcNDF"

initializeContext().then((context) => {
    let spot = 40000;
    let iv = 0.6;
    let r = 0;
    let q = 0;

    calcNDF(context, spot, iv, r, q);
})