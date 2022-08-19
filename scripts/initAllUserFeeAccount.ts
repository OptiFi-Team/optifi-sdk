import { initializeContext } from "../index";
import initializeFeeAccount from "../instructions/user/initializeFeeAccount";
import { findUserAccount } from "../utils/accounts";
import { getAllUsersOnExchange } from "../utils/accounts";
import { sleep } from "../utils/generic";



initializeContext().then(async (context) => {

    let Users = await getAllUsersOnExchange(context);

    for (let user of Users) {
        initializeFeeAccount(context, user.publicKey).then((res) => {
            console.log("Got init res", res);
        }).catch((err) => {
            console.error(err);
        })
    }
})

