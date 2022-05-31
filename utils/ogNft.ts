import { Transaction, PublicKey } from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import Context from "../types/context";
import { OG_NFT_MINT } from "../constants";
import { getTokenAccountFromAccountInfo } from "./token";
import { BN } from "@project-serum/anchor";

// check if a wallet address holds an og nft
export async function checkIfUserHasOgNft(context: Context, userWallet?: PublicKey): Promise<boolean> {
    let wallet = userWallet ? userWallet : context.provider.wallet.publicKey
    let nftMint = new PublicKey(OG_NFT_MINT[context.endpoint])

    let ata = await getAssociatedTokenAddress(nftMint, wallet)
    let acctInfo = await context.connection.getAccountInfo(ata)

    if (acctInfo) {
        let tokenAccount = await getTokenAccountFromAccountInfo(acctInfo, ata)
        if (tokenAccount.amount >= 1) {
            return true
        }
    }
    return false
}

// airdrop OG nft to users
export async function airdropNft(context: Context, nftMint: PublicKey, toWallet: PublicKey, airdropAmount: number) {
    let fromWallet = context.provider.wallet

    let tx = new Transaction();
    let fromAta = await getAssociatedTokenAddress(nftMint, fromWallet.publicKey)

    let toAta = await getAssociatedTokenAddress(nftMint, toWallet)
    // console.log("fromAta: ", fromAta.toString())
    // console.log("toAta: ", toAta.toString())

    let acctInfo = await context.connection.getAccountInfo(toAta)
    if (acctInfo == null) {
        console.log(`Associated Token Account at ${toAta.toString()} did not exist, trying to create for user ${toWallet}`);
        tx.add(createAssociatedTokenAccountInstruction(
            fromWallet.publicKey,
            toAta,
            toWallet,
            nftMint,
        ))
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
    } else {
        let tokenAccount = await getTokenAccountFromAccountInfo(acctInfo!, toAta)
        if (new BN(tokenAccount.amount.toString()).toNumber() == 0) {
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

        } else {
        }
    }
}
