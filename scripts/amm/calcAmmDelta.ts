import { initializeContext } from "../../index";
import { calcAmmDelta } from "./utils";
import { ammIndex } from "./constants";

initializeContext().then((context) => {
    calcAmmDelta(context, ammIndex)
})
