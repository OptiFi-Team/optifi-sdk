import Context from "../types/context";
import { PublicKey } from "@solana/web3.js";
import { findAccountWithSeeds } from "./accounts";
import { PREFIX_MARGIN_STRESS } from "../constants";


export function findMarginStressWithAsset(context: Context,
    exchangeAddress: PublicKey,
    asset: number): Promise<[PublicKey, number]> {
    return findAccountWithSeeds(context, [
        Buffer.from(PREFIX_MARGIN_STRESS),
        exchangeAddress.toBuffer(),
        Uint8Array.of(asset)
    ])
}
