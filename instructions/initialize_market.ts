import * as anchor from "@project-serum/anchor";
import {PublicKey} from "@solana/web3.js";

/**
 * Create a new serum market, with the specified authority
 *
 * @param authority
 */
export default function initializeMarket(authority: PublicKey) {
    let coinVaultWallet = anchor.web3.Keypair.generate();
}