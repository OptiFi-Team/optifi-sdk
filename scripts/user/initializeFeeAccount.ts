import { initializeContext } from "../../index";
import initializeFeeAccount from "../../instructions/user/initializeFeeAccount";
import { findUserAccount } from "../../utils/accounts";



initializeContext().then(async (context) => {

    let [userAccount, _] = await findUserAccount(context);

    initializeFeeAccount(context, userAccount).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})