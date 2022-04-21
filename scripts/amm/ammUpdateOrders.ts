import { initializeContext } from "../../index";
import { executeAmmOrderProposal, executeAmmOrderProposalV2 } from "./utils";
import { ammIndex } from "./constants";


initializeContext().then((context) => {
    executeAmmOrderProposalV2(context, ammIndex)
})
