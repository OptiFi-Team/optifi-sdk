import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import path from "path/posix";
import fs from "fs"
import { OG_NFT_MINT } from "../../constants";
import { airdropNft } from "../../utils/ogNft";

// import * as XLSX from 'xlsx'


/* load 'stream' for stream support */
// import { Readable } from 'stream';
// XLSX.stream.set_readable(Readable);

// /* load the codepage support library for extended support with older formats  */
// import * as cpexcel from 'xlsx';
// XLSX.set_cptable(cpexcel);

initializeContext().then(async (context) => {
    let nftMint = new PublicKey(OG_NFT_MINT[context.endpoint])
    let airdropAmount = 1

    // let filePath = path.resolve(__dirname, "addresses.json");
    // let addresses = JSON.parse(
    //     fs.readFileSync(
    //         filePath,
    //         "utf-8"
    //     )
    // )
    // for (let e of addresses) {
    //     let name = Object.keys(e)[0]
    //     let toWallet = new PublicKey(e[name])
    //     let res = await airdropNft(context, nftMint, toWallet, airdropAmount)
    //     console.log(`Sucessfully airdropped ${airdropAmount} OG NFT to ${name}'s wallet ${toWallet}, txid: ${res} `)
    // }


    // var workbook = XLSX.readFile("/Users/princegao/Desktop/optifi-sdk/scripts/ogNFT/OptiFi_OG_NFT_20220527.xlsx");

    // let ogList = XLSX.utils.sheet_to_json(workbook.Sheets["1st batch"])
    let filePath = path.resolve(__dirname, "addresses-20220527.json");
    let addresses = JSON.parse(
        fs.readFileSync(
            filePath,
            "utf-8"
        )
    )
    console.log("addresses.length: ", addresses.length)
    for (let e of addresses) {
        try {
            let name = e["Discord ID"]
            let toWallet = new PublicKey(e["Solana Address"].trim())
                let res = await airdropNft(context, nftMint, toWallet, airdropAmount)
                console.log(`Sucessfully airdropped ${airdropAmount} OG NFT to ${name}'s wallet ${toWallet}, txid: ${res} `)
        } catch (err) {
            console.log(e)
            console.log(err)
        }
    }
})

