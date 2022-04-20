import { initializeContext } from "../../index";
import { syncAmmPositions, syncAmmFuturePositions, updateAmmFutureOrders } from "./utils";

let ammIndex = 1;

initializeContext().then((context) => {
    updateAmmFutureOrders(context, ammIndex)
})
