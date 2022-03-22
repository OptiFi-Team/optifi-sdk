import { initializeContext } from "../../index";
import { executeAmmOrderProposal } from "./utils";

let ammIndex = 1;

initializeContext().then((context) => {
    executeAmmOrderProposal(context, ammIndex)
})
