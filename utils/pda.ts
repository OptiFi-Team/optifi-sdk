import Context from "../types/context";
import { PublicKey } from "@solana/web3.js";
import {
    AMM_LIQUIDITY_AUTH_PREFIX,
    OPTIFI_MARKET_MINT_AUTH_PREFIX, SERUM_MARKET_AUTHORITY, SERUM_PRUNE_AUTHORITY,
    USDC_CENTRAL_POOL_PREFIX,
    USDC_POOL_AUTH_PREFIX
} from "../constants";
import { findAccountWithSeeds, findExchangeAccount } from "./accounts";
import * as anchor from "@project-serum/anchor";

export function derivePDAAddress(context: Context, prefix: string): Promise<[PublicKey, number]> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findAccountWithSeeds(context, [
                Buffer.from(prefix),
                exchangeAddress.toBuffer()
            ])
                .then((res) => resolve(res))
                .catch((err) => reject(err))
        })
    })
}

export function findOptifiMarketMintAuthPDA(context: Context): Promise<[PublicKey, number]> {
    return derivePDAAddress(context, OPTIFI_MARKET_MINT_AUTH_PREFIX);
}

export function findOptifiUSDCPoolAuthPDA(context: Context): Promise<[PublicKey, number]> {
    return derivePDAAddress(context, USDC_POOL_AUTH_PREFIX);
}

export function findSerumAuthorityPDA(context: Context): Promise<[PublicKey, number]> {
    return derivePDAAddress(context, SERUM_MARKET_AUTHORITY);
}

export function findSerumPruneAuthorityPDA(context: Context): Promise<[PublicKey, number]> {
    return derivePDAAddress(context, SERUM_PRUNE_AUTHORITY);
}

export function getAmmLiquidityAuthPDA(context: Context): Promise<[PublicKey, number]> {
    return derivePDAAddress(context, AMM_LIQUIDITY_AUTH_PREFIX);
}

// export function getAmmMangoAccountPDA(context: Context): Promise<[PublicKey, number]> {
//     return derivePDAAddress(context, AMM_LIQUIDITY_AUTH_PREFIX);
// }

export function getMangoAccountPDA(mangoProgramId: PublicKey, mangoGroup: PublicKey, owner: PublicKey, accountNum: number): Promise<[PublicKey, number]> {
    let seeds = [
        mangoGroup.toBuffer(),
        owner.toBuffer(),
        new anchor.BN(accountNum).toArrayLike(Buffer, "le", 8),
    ]
    return anchor.web3.PublicKey.findProgramAddress(
        seeds,
        mangoProgramId
    )
}


// /// find mango account pda
// pub fn find_mango_account_pda(
//     mango_group_pk: &Pubkey,
//     owner_pk: &Pubkey,
//     account_num: u64,
//     mango_program_id: &Pubkey,
// ) -> (Pubkey, u8) {
//     let seeds: &[&[u8]] = &[
//         &mango_group_pk.as_ref(),
//         &owner_pk.as_ref(),
//         &account_num.to_le_bytes(),
//     ];
//     return Pubkey::find_program_address(seeds, mango_program_id);
// }
