import { initializeContext } from "../../index";
import { syncAmmPositions, syncAmmFuturePositions, updateAmmFutureOrders } from "./utils";
import { ammIndex } from "./constants";

initializeContext().then((context) => {
    updateAmmFutureOrders(context, ammIndex)
})
