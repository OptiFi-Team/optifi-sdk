
import { Account, PublicKey, SystemProgram, TransactionInstruction, TransactionSignature, Transaction } from "@solana/web3.js";
import { Market, DexInstructions } from '@project-serum/serum';
import * as anchor from "@project-serum/anchor";

import Context from "../../types/context";
import { findExchangeAccount, findUserAccount } from "../../utils/accounts";
import { AmmAccount } from "../../types/optifi-exchange-types";
import { getAmmLiquidityAuthPDA } from "../../utils/pda";
import { TOKEN_PROGRAM_ID, getAccount, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { signAndSendTransaction, TransactionResultType } from "../../utils/transactions";
import InstructionResult from "../../types/instructionResult";
import { findAssociatedTokenAccount } from "../../utils/token";
import { SERUM_DEX_PROGRAM_ID, USDC_TOKEN_MINT } from "../../constants";


// consume Serum Events queue
export async function consumeEvents(
    context: Context,
    serumMarket: PublicKey,
    openOrdersAccounts: PublicKey[],
    eventQueue: PublicKey,
    pcFeeAccount: PublicKey,
    coinFeeAccount: PublicKey,
    limit: number,
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        let serumDexProgramId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint])

        // let owner: Account = myWallet;
        // let marketAccont = await Market.load(connection, marketAddress, {}, serumDexProgramId);
        try {
            const tx1 = new Transaction();
            let inx = DexInstructions.consumeEvents({
                market: serumMarket,
                openOrdersAccounts: openOrdersAccounts,
                eventQueue: eventQueue,
                pcFee: pcFeeAccount,
                coinFee: coinFeeAccount,
                limit: limit,
                programId: serumDexProgramId,
            });

            tx1.add(inx);

            let res = await context.provider.send(tx1);

            resolve({
                successful: true,
                data: res as TransactionSignature
            })
        } catch (err) {
            reject(err)
        }

    })
}



export default function ammDeposit(context: Context,
    ammAddress: PublicKey,
    amount: number): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findUserAccount(context).then(([userAccountAddress, _]) => {
                context.program.account.ammAccount.fetch(ammAddress).then((ammRes) => {
                    // @ts-ignore
                    let amm = ammRes as AmmAccount;
                    findAssociatedTokenAccount(context, new PublicKey(USDC_TOKEN_MINT[context.endpoint])).then(([userQuoteTokenVault, _]) => {
                        findAssociatedTokenAccount(context, amm.lpTokenMint).then(async ([userLpTokenVault, _]) => {
                            let instructions: TransactionInstruction[] = []
                            try {
                                let accountInfo = await getAccount(context.connection, userLpTokenVault, "processed")
                                console.log("user lp token accountInfo: ", accountInfo)
                            } catch (err) {
                                // console.log("err: ", err)
                                if (`${err}`.includes("TokenAccountNotFoundError")) {
                                    console.log("adding init lp token account inx")
                                    instructions.push(
                                        createAssociatedTokenAccountInstruction(
                                            context.provider.wallet.publicKey,
                                            userLpTokenVault,
                                            context.provider.wallet.publicKey,
                                            ammRes.lpTokenMint,
                                        )
                                    )
                                } else {
                                    reject(err)
                                }
                            }
                            getAmmLiquidityAuthPDA(context).then(([liquidityAuthPDA, _]) => {
                                context.connection.getTokenAccountBalance(userQuoteTokenVault).then(tokenAmount => {
                                    context.program.rpc.ammDeposit(
                                        new anchor.BN(amount * (10 ** tokenAmount.value.decimals)),
                                        {
                                            accounts: {
                                                optifiExchange: exchangeAddress,
                                                amm: ammAddress,
                                                userAccount: userAccountAddress,
                                                ammQuoteTokenVault: amm.quoteTokenVault,
                                                userQuoteTokenVault: userQuoteTokenVault,
                                                lpTokenMint: amm.lpTokenMint,
                                                ammLiquidityAuth: liquidityAuthPDA,
                                                userLpTokenVault: userLpTokenVault,
                                                user: context.provider.wallet.publicKey,
                                                tokenProgram: TOKEN_PROGRAM_ID
                                            },
                                            instructions: instructions
                                        }
                                    ).then((res) => {
                                        resolve({
                                            successful: true,
                                            data: res as TransactionSignature
                                        })
                                    }).catch((err) => reject(err))
                                }).catch((err) => reject(err))
                            }).catch((err) => reject(err))
                        }).catch((err) => reject(err))
                    }).catch((err) => reject(err))
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}