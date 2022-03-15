import { initializeContext } from "../../index";
import { calcAmmDelta } from "./utils";


let ammIndex = 1;

initializeContext().then((context) => {
    calcAmmDelta(context, ammIndex)
})
