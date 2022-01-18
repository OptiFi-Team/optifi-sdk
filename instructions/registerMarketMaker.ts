import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY, TransactionSignature} from "@solana/web3.js";
import {findExchangeAccount, findMarketMakerAccount, findUserAccount} from "../utils/accounts";
import {findOrCreateAssociatedTokenAccount} from "../utils/token";
import {USDC_TOKEN_MINT} from "../constants";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";

export default function registerMarketMaker(context: Context): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findUserAccount(context).then(([userAccountAddress, _]) => {
                findMarketMakerAccount(context).then(([marketMakerAccount]) => {
                    findOrCreateAssociatedTokenAccount(context,
                            new PublicKey(USDC_TOKEN_MINT[context.endpoint]),
                        marketMakerAccount).then((liquidityPoolAccount) => {
                            let registerMarketMakerTx = context.program.transaction.registerMarketMaker({
                                accounts: {
                                    optifiExchange: exchangeAddress,
                                    userAccount: userAccountAddress,
                                    marketMakerAccount: marketMakerAccount,
                                    liquidityPool: liquidityPoolAccount,
                                    owner: context.provider.wallet.publicKey,
                                    systemProgram: SystemProgram.programId,
                                    clock: SYSVAR_CLOCK_PUBKEY
                                }
                        });
                            signAndSendTransaction(context, registerMarketMakerTx).then((txRes) => {
                                if (txRes.resultType === TransactionResultType.Successful) {
                                    console.log("Successfully registered market maker",
                                        formatExplorerAddress(context, txRes.txId as string,
                                            SolanaEntityType.Transaction));
                                    resolve({
                                        successful: true,
                                        data: txRes.txId as TransactionSignature
                                    })
                                }
                            }).catch((err) => {
                                console.error(err);
                                reject(err);
                            })
                    }).catch((err) => reject(err))
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}