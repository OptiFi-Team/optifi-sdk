import { initializeContext } from "../../index";
import mmSettlePenaltyReward from "../../instructions/marketMaker/mmSettlePenaltyReward";
import { findUserAccount } from "../../utils/accounts";

initializeContext().then(async (context) => {
    // Can be other mm user account
    let [userAccountAddress, _] = await findUserAccount(context)

    mmSettlePenaltyReward(context, userAccountAddress).then((res) => {
        console.log("Got init res", res);
    }).catch((err) => {
        console.error(err);
    })
})