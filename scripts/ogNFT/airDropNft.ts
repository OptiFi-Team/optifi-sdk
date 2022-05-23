import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import path from "path/posix";
import fs from "fs"
import { OG_NFT_MINT } from "../../constants";
import { airdropNft } from "../../utils/ogNft";

initializeContext().then(async (context) => {
    let nftMint = new PublicKey(OG_NFT_MINT[context.endpoint])
    let airdropAmount = 1

    let filePath = path.resolve(__dirname, "addresses.json");
    let addresses = JSON.parse(
        fs.readFileSync(
            filePath,
            "utf-8"
        )
    )
    for (let e of addresses) {
        let name = Object.keys(e)[0]
        let toWallet = new PublicKey(e[name])
        let res = await airdropNft(context, nftMint, toWallet, airdropAmount)
        console.log(`Sucessfully airdropped ${airdropAmount} OG NFT to ${name}'s wallet ${toWallet}, txid: ${res} `)
    }
})

