import * as anchor from "@project-serum/anchor";
import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {
    PublicKey,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    TransactionSignature
} from "@solana/web3.js";
import { getAmmLiquidityAuthPDA } from "../utils/pda";
import { assetToOptifiAsset, optifiAssetToNumber, optifiDurationToNumber } from "../utils/generic";
import { signAndSendTransaction, TransactionResultType } from "../utils/transactions";
import { AccountLayout, createInitializeAccountInstruction, createInitializeMintInstruction, MintLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { AMM_TRADE_CAPACITY, SERUM_MARKETS, USDC_TOKEN_MINT } from "../constants";
import { findAMMAccounts, findAMMWithIdx } from "../utils/amm";
import { findExchangeAccount } from "../utils/accounts";
import Asset from "../types/asset";
import { Duration } from "../types/optifi-exchange-types";

export function initializeAmm(context: Context,
    asset: Asset,
    idx: number,
    duration: Duration,
    contractSize: number
): Promise<InstructionResult<TransactionSignature>> {
    let optifiAsset = assetToOptifiAsset(asset);
    return new Promise((resolve, reject) => {
        let ammUSDCTokenVault = anchor.web3.Keypair.generate();
        getAmmLiquidityAuthPDA(context).then(([ammLiquidityAuthAddress, _]) => {
            context.connection.getMinimumBalanceForRentExemption(AccountLayout.span).then((accountMin) => {
                let ammLPTokenMint = anchor.web3.Keypair.generate();
                context.connection.getMinimumBalanceForRentExemption(MintLayout.span).then((mintMin) => {
                    findExchangeAccount(context).then(([exchangeAddress, _]) => {
                        findAMMWithIdx(context, exchangeAddress, idx).then(([ammAddress, bump]) => {
                            console.log("Initializing AMM with idx ", idx, "bump ", bump, "asset", optifiAssetToNumber(optifiAsset),
                                "with address", ammAddress.toString());
                            context.program.rpc.initializeAmm(
                                bump,
                                {
                                    ammIdx: idx,
                                    ammCapacity: new anchor.BN(AMM_TRADE_CAPACITY),
                                    bump: bump,
                                    asset: optifiAssetToNumber(optifiAsset),
                                    numInstruments: SERUM_MARKETS,
                                    duration: optifiDurationToNumber(duration),
                                    contractSize: new anchor.BN(contractSize)
                                },
                                {
                                    accounts: {
                                        optifiExchange: exchangeAddress,
                                        amm: ammAddress,
                                        usdcTokenVault: ammUSDCTokenVault.publicKey,
                                        lpTokenMint: ammLPTokenMint.publicKey,
                                        payer: context.provider.wallet.publicKey,
                                        tokenProgram: TOKEN_PROGRAM_ID,
                                        systemProgram: SystemProgram.programId,
                                        rent: SYSVAR_RENT_PUBKEY
                                    },
                                    signers: [ammUSDCTokenVault, ammLPTokenMint],
                                    instructions: [
                                        SystemProgram.createAccount({
                                            fromPubkey: context.provider.wallet.publicKey,
                                            newAccountPubkey: ammUSDCTokenVault.publicKey,
                                            lamports: accountMin,
                                            space: AccountLayout.span,
                                            programId: TOKEN_PROGRAM_ID
                                        }),
                                        createInitializeAccountInstruction(
                                            ammUSDCTokenVault.publicKey,
                                            new PublicKey(USDC_TOKEN_MINT[context.endpoint]),
                                            ammLiquidityAuthAddress,
                                            TOKEN_PROGRAM_ID
                                        ),
                                        SystemProgram.createAccount({
                                            fromPubkey: context.provider.wallet.publicKey,
                                            newAccountPubkey: ammLPTokenMint.publicKey,
                                            lamports: mintMin,
                                            space: MintLayout.span,
                                            programId: TOKEN_PROGRAM_ID
                                        }),
                                        createInitializeMintInstruction(
                                            ammLPTokenMint.publicKey,
                                            0,
                                            ammLiquidityAuthAddress,
                                            ammLiquidityAuthAddress,
                                            TOKEN_PROGRAM_ID
                                        )
                                    ]
                                }).then((res) => {
                                    resolve({
                                        successful: true,
                                        data: res as TransactionSignature
                                    })
                                }).catch((err) => reject(err))
                        }).catch((err) => reject(err));
                    }).catch((err) => reject(err))
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}

export function initializeNextAmm(
    context: Context,
    asset: Asset,
    duration: Duration,
    contract_size: number
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findAMMAccounts(context).then((ammAccounts) => {
            let newIdx = ammAccounts.length + 1;
            console.debug(`Creating new AMM account at IDX ${newIdx}`);
            initializeAmm(context, asset, newIdx, duration, contract_size)
                .then((res) => resolve(res))
                .catch((err) => reject(err))
        }).catch((err) => reject(err));
    })
}