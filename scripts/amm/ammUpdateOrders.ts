import { initializeContext } from "../../index";
import { executeAmmOrderProposal, executeAmmOrderProposalV2 } from "./utils";

let ammIndex = 1;

initializeContext().then((context) => {
    executeAmmOrderProposalV2(context, ammIndex)
})
