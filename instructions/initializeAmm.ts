import * as anchor from "@project-serum/anchor";
import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    Transaction,
    TransactionSignature
} from "@solana/web3.js";
import {getAmmLiquidityAuthPDA} from "../utils/pda";
import {assetToOptifiAsset} from "../utils/generic";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";
import {AccountLayout, MintLayout, Token, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {AMM_TRADE_CAPACITY, SERUM_MARKETS, USDC_TOKEN_MINT} from "../constants";
import {findAMMAccounts, findAMMWithIdx} from "../utils/amm";
import {findExchangeAccount} from "../utils/accounts";
import Asset from "../types/asset";

function createAmmUSDCVault(context: Context,
                            usdcVault: Keypair,
                            liquidityAuthPDA: PublicKey): Promise<TransactionSignature> {
    return new Promise((resolve, reject) => {
        context.connection.getMinimumBalanceForRentExemption(AccountLayout.span).then((min) => {
            let ammVaultTx = new Transaction();
            ammVaultTx.add(
                SystemProgram.createAccount({
                    fromPubkey: context.provider.wallet.publicKey,
                    newAccountPubkey: usdcVault.publicKey,
                    lamports: min,
                    space: AccountLayout.span,
                    programId: TOKEN_PROGRAM_ID
                }),
                Token.createInitAccountInstruction(
                    TOKEN_PROGRAM_ID,
                    new PublicKey(USDC_TOKEN_MINT[context.endpoint]),
                    usdcVault.publicKey,
                    liquidityAuthPDA
                )
            )
            signAndSendTransaction(context, ammVaultTx, [
                usdcVault
            ]).then((txResult) => {
                if (txResult.resultType === TransactionResultType.Successful) {
                    resolve(txResult.txId as TransactionSignature);
                } else {
                    console.error(txResult);
                    reject(txResult);
                }
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}

function createAMMLPTokenMint(context: Context,
                              lpTokenMintWallet: Keypair,
                              liquidityAuthPDA: PublicKey): Promise<TransactionSignature> {
    return new Promise((resolve, reject) => {
        context.connection.getMinimumBalanceForRentExemption(MintLayout.span).then((min) => {
            let mintTx = new Transaction();
            mintTx.add(
                SystemProgram.createAccount({
                    fromPubkey: context.provider.wallet.publicKey,
                    newAccountPubkey: lpTokenMintWallet.publicKey,
                    lamports: min,
                    space: MintLayout.span,
                    programId: TOKEN_PROGRAM_ID
                }),
                Token.createInitMintInstruction(
                    TOKEN_PROGRAM_ID,
                    lpTokenMintWallet.publicKey,
                    0,
                    liquidityAuthPDA,
                    liquidityAuthPDA
                )
            );
            signAndSendTransaction(context, mintTx, [lpTokenMintWallet]).then((mintRes) => {
                if (mintRes.resultType === TransactionResultType.Successful) {
                    resolve(mintRes.txId as TransactionSignature);
                } else {
                    console.error(mintRes);
                    reject(mintRes);
                }
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}


export function initializeAmm(context: Context,
                              asset: Asset,
                              idx: number): Promise<InstructionResult<TransactionSignature>> {
    let optifiAsset = assetToOptifiAsset(asset);
    return new Promise((resolve, reject) => {
        let ammUSDCTokenVault = anchor.web3.Keypair.generate();
        getAmmLiquidityAuthPDA(context).then(([ammLiquidityAuthAddress, _]) => {
            createAmmUSDCVault(context, ammUSDCTokenVault, ammLiquidityAuthAddress).then(() => {
                let ammLPTokenMint = anchor.web3.Keypair.generate();
                createAMMLPTokenMint(context, ammLPTokenMint, ammLiquidityAuthAddress).then(() => {
                    findExchangeAccount(context).then(([exchangeAddress, _]) => {
                        findAMMWithIdx(context, exchangeAddress, idx).then(([ammAddress, bump]) => {
                            // @ts-ignore
                            let initializeAmmTx = context.program.transaction.initializeAmm(bump, {
                                ammIdx: idx,
                                ammCapacity: new anchor.BN(AMM_TRADE_CAPACITY),
                                bump: bump,
                                asset: optifiAsset,
                                numInstruments: SERUM_MARKETS
                            }, {
                                accounts: {
                                    optifiExchange: exchangeAddress,
                                    amm: ammAddress,
                                    usdcTokenVault: ammUSDCTokenVault.publicKey,
                                    lpTokenMint: ammLPTokenMint.publicKey,
                                    payer: context.provider.wallet.publicKey,
                                    tokenProgram: TOKEN_PROGRAM_ID,
                                    systemProgram: SystemProgram.programId,
                                    rent: SYSVAR_RENT_PUBKEY
                                }
                            })
                            signAndSendTransaction(context, initializeAmmTx).then((initializeAmmRes) => {
                                if (initializeAmmRes.resultType === TransactionResultType.Successful) {
                                    resolve({
                                        successful: true,
                                        data: initializeAmmRes.txId as TransactionSignature
                                    })
                                } else {
                                    console.error(initializeAmmRes);
                                    reject(initializeAmmRes)
                                }
                            }).catch((err) => reject(err))
                        }).catch((err) => reject(err));
                    }).catch((err) => reject(err))
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}

export function initializeNextAmm(context: Context,
                                  asset: Asset): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findAMMAccounts(context).then((ammAccounts) => {
            let newIdx = ammAccounts.length + 1;
            console.debug(`Creating new AMM account at IDX ${newIdx}`);
            initializeAmm(context, asset, newIdx)
                .then((res) => resolve(res))
                .catch((err) => reject(err))
        }).catch((err) => reject(err));
    })
}