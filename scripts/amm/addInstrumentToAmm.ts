import { initializeContext } from "../../index";
import { addInstrumentsToAmm } from "./utils";

let ammIdxs = [1, 2, 3]

initializeContext().then(async (context) => {
    for (let ammIndex of ammIdxs) {
        await addInstrumentsToAmm(context, ammIndex)
    }
});
