import { initializeContext } from "../../index";
import { syncAmmPositions } from "./utils";

let ammIndex = 1;

initializeContext().then((context) => {
    syncAmmPositions(context, ammIndex)
})
