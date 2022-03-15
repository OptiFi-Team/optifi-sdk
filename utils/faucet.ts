import { Transaction, PublicKey, Keypair } from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { SolanaEndpoint, USDC_DECIMALS, USDC_TOKEN_MINT } from "../constants"
import Context from "../types/context";
// import testWallet from "../test_account.json";

import { initializeContext } from "../index";

const airdropAmount = 100000;

const wallet = [50, 58, 192, 181, 214, 233, 144, 110, 173, 47, 187, 12, 192, 243, 89, 166, 82, 75, 206, 105, 28, 55, 81, 152, 46, 14, 159, 103, 128, 161, 110, 206, 31, 74, 15, 187, 75, 57, 42, 93, 133, 57, 191, 158, 48, 21, 186, 11, 73, 87, 90, 92, 31, 110, 96, 182, 208, 212, 194, 32, 234, 100, 240, 147]

export default async function airdropUSDC(context: Context) {
    if (context.endpoint != SolanaEndpoint.Devnet) {
        throw Error("only devnet airdrop is supported")
    }

    let fromWallet = Keypair.fromSecretKey(
        new Uint8Array(
            wallet
        ))
    // console.log("fromWallet: ", fromWallet.publicKey.toString())
    let usdcMint = new PublicKey(USDC_TOKEN_MINT[SolanaEndpoint.Devnet])
    let tx = new Transaction();
    let fromAta = await getAssociatedTokenAddress(usdcMint, fromWallet.publicKey)
    let toAta = await getAssociatedTokenAddress(usdcMint, context.provider.wallet.publicKey)
    // console.log("fromAta: ", fromAta.toString())
    // console.log("toAta: ", toAta.toString())

    let acctInfo = await context.connection.getAccountInfo(toAta)
    if (acctInfo == null) {
        console.log(`Associated Token Account at ${toAta.toString()} did not exist, trying to create for user`);
        tx.add(createAssociatedTokenAccountInstruction(
            context.provider.wallet.publicKey,
            toAta,
            context.provider.wallet.publicKey,
            usdcMint,
        ))
    }

    tx.add(
        createTransferInstruction(
            fromAta,
            toAta,
            fromWallet.publicKey,
            airdropAmount * (10 ** USDC_DECIMALS),
        )
    );

    let txid = await context.provider.send(tx, [fromWallet])
    return txid;
}

initializeContext().then((context) => {
    airdropUSDC(context).then(txid => console.log("airdropUSDC txid: ", txid))
})