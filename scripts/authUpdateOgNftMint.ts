
import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../index";
import updateOgNftMint from "../instructions/authUpdateNftMint";
import { findOptifiExchange } from "../utils/accounts";

initializeContext().then(async (context) => {
    let ogNftMint = new PublicKey("4bWGR29Mp4rXnC2h1hRWh77Ktj3WzHUMzpxfeukAytsw");
    let res = await updateOgNftMint(context, ogNftMint);
    console.log("updateOgNftMint res: ", res)

    let [exchangeAddress, _] = await findOptifiExchange(context)
    let optitiExchange = await context.program.account.exchange.fetch(exchangeAddress)
    // @ts-ignore
    console.log("optitiExchange og nft mint is: ", optitiExchange.ogNftMint && optitiExchange.ogNftMint.toString())
})