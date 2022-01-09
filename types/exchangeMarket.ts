import * as anchor from "@project-serum/anchor";
import {PublicKey} from "@solana/web3.js";

export default interface ExchangeMarket {
    optifiMarketPubkey: PublicKey,
    optifiMarketId: number,
    serumMarket: PublicKey,
    instrument: PublicKey,
    expiryDate: anchor.BN,
    isStopped: boolean
}