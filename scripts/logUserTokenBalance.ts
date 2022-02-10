import {initializeContext} from "../index";
import {findUserAccount, userAccountExists} from "../utils/accounts";
import {UserAccount} from "../types/optifi-exchange-types";

// You should already have the context object
initializeContext().then((context) => {
    // Use it to get the users account address
    findUserAccount(context).then(([userAccountAddress, _]) => {
        // Load the user account data from that address
        context.program.account.userAccount.fetch(userAccountAddress).then((userAccountRes) => {
            // Cast it to the right type
            // @ts-ignore
            let userAccount = userAccountRes as UserAccount;
            // Get the token balance
            context.connection.getTokenAccountBalance(userAccount.userMarginAccountUsdc).then((tokAmount) => {
                console.log(`User account balance - $${tokAmount.value.uiAmount}`)
            })
        })
    })
})