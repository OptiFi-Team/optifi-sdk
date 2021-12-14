import * as anchor from "@project-serum/anchor";
import {PublicKey} from "@solana/web3.js";
import Context from "../types/context";

/**
 * Create a new serum market, with the specified authority
 *
 * @param context Program context
 * @param authority
 */
export default function initializeMarket(context: Context, authority: PublicKey) {
    let coinVaultWallet = anchor.web3.Keypair.generate();
}