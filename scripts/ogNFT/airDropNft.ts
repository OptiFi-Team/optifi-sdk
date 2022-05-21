import { Transaction, PublicKey } from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import Context from "../../types/context";
import { initializeContext } from "../../index";
import path from "path/posix";
import fs from "fs"

initializeContext().then(async (context) => {
    let nftMint = new PublicKey("u5vbDPVKUJMDXimVzT46FqCZzj1MvozGjhQ4LuwXMFr")
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


export default async function airdropNft(context: Context, nftMint: PublicKey, toWallet: PublicKey, airdropAmount: number) {
    let fromWallet = context.provider.wallet

    let tx = new Transaction();
    let fromAta = await getAssociatedTokenAddress(nftMint, fromWallet.publicKey)

    let toAta = await getAssociatedTokenAddress(nftMint, toWallet)
    // console.log("fromAta: ", fromAta.toString())
    // console.log("toAta: ", toAta.toString())

    let acctInfo = await context.connection.getAccountInfo(toAta)
    if (acctInfo == null) {
        console.log(`Associated Token Account at ${toAta.toString()} did not exist, trying to create for user`);
        tx.add(createAssociatedTokenAccountInstruction(
            fromWallet.publicKey,
            toAta,
            toWallet,
            nftMint,
        ))
    }

    tx.add(
        createTransferInstruction(
            fromAta,
            toAta,
            fromWallet.publicKey,
            airdropAmount,
        )
    );

    let txid = await context.provider.send(tx)
    return txid;
}
