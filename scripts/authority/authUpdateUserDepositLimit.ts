
import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import updateOgNftMint from "../../instructions/authority/authUpdateNftMint";
import updateUserDepositLimit from "../../instructions/authority/authUpdateUserDepositLimit";
import { findOptifiExchange } from "../../utils/accounts";

initializeContext().then(async (context) => {
    let newAmount = 3000; // already considered decimal
    let res = await updateUserDepositLimit(context, newAmount);
    console.log("updateUserDepositLimit res: ", res)

    let [exchangeAddress, _] = await findOptifiExchange(context)
    let optitiExchange = await context.program.account.exchange.fetch(exchangeAddress)
    // @ts-ignore
    console.log("optitiExchange UserDepositLimit is: ", optitiExchange.userDepositLimit && optitiExchange.userDepositLimit.toNumber())
})