import { initializeContext } from "../../index";
import { calculateAmmProposals } from "./utils";

let ammIndex = 1

initializeContext().then((context) => {
    calculateAmmProposals(context, ammIndex)
})
