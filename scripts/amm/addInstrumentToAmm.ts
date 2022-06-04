import { initializeContext } from "../../index";
import { ammIndex } from "./constants";
import { addInstrumentsToAmm } from "./utils";

initializeContext().then((context) => {
    addInstrumentsToAmm(context, ammIndex)
})
