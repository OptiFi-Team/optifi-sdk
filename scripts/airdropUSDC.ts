import { Transaction, PublicKey, Keypair } from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { SolanaCluster, USDC_DECIMALS, USDC_TOKEN_MINT } from "../constants"
import Context from "../types/context";
// import testWallet from "../test_account.json";
import airdropUSDC from "../utils/faucet"

import { initializeContext } from "../index";

initializeContext().then((context) => {
    airdropUSDC(context).then(txid => console.log("airdropUSDC txid: ", txid))
})