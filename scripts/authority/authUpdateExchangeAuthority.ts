
import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import updateExchangeAuthority from "../../instructions/authority/authUpdateExchangeAuthority";
import { findOptifiExchange } from "../../utils/accounts";

initializeContext().then(async (context) => {
    let newAuthority = new PublicKey("")
    let res = await updateExchangeAuthority(context, newAuthority);
    console.log("updateExchangeAuthority res: ", res)

    let [exchangeAddress, _] = await findOptifiExchange(context)
    let optitiExchange = await context.program.account.exchange.fetch(exchangeAddress)
    // @ts-ignore
    console.log("optitiExchange exchangeAuthority is: ", optitiExchange.exchangeAuthority.toNumber())
})