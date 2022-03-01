import Context from "../types/context";
import {
    userAccountExists,
} from "./accounts";
import {
    UserAccount,
} from "../types/optifi-exchange-types";


export function getAmountToReserve(
    context: Context
): Promise<void> {
    return new Promise((resolve, reject) => {
        userAccountExists(context)
            .then(([acctExists, res]) => {
                if (acctExists) {
                    let userAccount = res as UserAccount;
                    let total_margin = 0;
                    for (let x of userAccount.amountToReserve) {
                        let margin = x.toNumber();
                        margin /= 10 ** 6; // devided with USDC decimals 6
                        if (margin > 0) {
                            total_margin += margin;
                            console.log(margin);
                        }
                    }
                    console.log("Total Margin Required: ", total_margin);
                } else {
                    reject("User Account not Exists")
                }
            })
            .catch((err) => reject(err));

    });
}
