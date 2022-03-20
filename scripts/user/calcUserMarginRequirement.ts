import { initializeContext } from "../../index";
import { calcMarginRequirementForUser } from "../../utils/calcMarginRequirementForUser";

initializeContext().then((context) => {
    calcMarginRequirementForUser(context).then(res => {
        console.log(res)
    })
})