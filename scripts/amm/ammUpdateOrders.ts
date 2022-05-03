import { initializeContext } from "../../index";
import { executeAmmOrderProposal } from "./utils";
import { ammIndex } from "./constants";


initializeContext().then((context) => {
    executeAmmOrderProposal(context, ammIndex)
})
