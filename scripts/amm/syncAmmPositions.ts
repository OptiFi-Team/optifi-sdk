import { initializeContext } from "../../index";
import { syncAmmPositions } from "./utils";
import { ammIndex } from "./constants";

initializeContext().then((context) => {
    syncAmmPositions(context, ammIndex)
})
