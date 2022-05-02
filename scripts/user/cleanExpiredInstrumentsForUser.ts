import { initializeContext } from "../../index";
import cleanExpiredInstrumentsForUser from "../../instructions/cleanExpiredInstrumentsForUser";
import { findUserAccount } from "../../utils/accounts";

initializeContext().then(async (context) => {
    try {
        let [userAccount,] = await findUserAccount(context)
        let res = await cleanExpiredInstrumentsForUser(context, userAccount)
        console.log("cleanExpiredInstrumentsForUser res: ", res)
    } catch (err) {
        console.log(err)
    }
})