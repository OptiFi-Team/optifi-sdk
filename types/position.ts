import * as anchor from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

export default interface Position {
    instruments: PublicKey,
    longTokenVault: PublicKey,
    shortTokenVault: PublicKey,
    latestPosition: anchor.BN,
    usdcBalance: anchor.BN
}