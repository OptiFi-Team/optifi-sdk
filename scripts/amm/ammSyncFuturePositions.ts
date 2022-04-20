import { initializeContext } from "../../index";
import { syncAmmPositions, syncAmmFuturePositions } from "./utils";

let ammIndex = 1;

initializeContext().then((context) => {
    syncAmmFuturePositions(context, ammIndex)
})
