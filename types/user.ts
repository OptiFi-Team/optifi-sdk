import * as anchor from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

export default interface UserPosition {
    instrument: PublicKey,
    long_qty: anchor.BN,
    short_qty: anchor.BN
}