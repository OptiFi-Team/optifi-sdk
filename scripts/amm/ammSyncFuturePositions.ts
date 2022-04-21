import { initializeContext } from "../../index";
import { syncAmmPositions, syncAmmFuturePositions } from "./utils";
import { ammIndex } from "./constants";

initializeContext().then((context) => {
    syncAmmFuturePositions(context, ammIndex)
})
