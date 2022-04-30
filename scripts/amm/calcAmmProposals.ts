import { initializeContext } from "../../index";
import { calculateAmmProposals } from "./utils";
import { ammIndex } from "./constants";

initializeContext().then((context) => {
    calculateAmmProposals(context, ammIndex)
})
