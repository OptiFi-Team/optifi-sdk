import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findMarketMakerAccount, findUserAccount } from "../../utils/accounts";
import { findOrCreateAssociatedTokenAccount } from "../../utils/token";
import { USDC_TOKEN_MINT } from "../../constants";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";

export default function registerMarketMaker(context: Context): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findUserAccount(context).then(([userAccountAddress, _]) => {
                findMarketMakerAccount(context).then(([marketMakerAccount, bump]) => {
                    findOrCreateAssociatedTokenAccount(context,
                        new PublicKey(USDC_TOKEN_MINT[context.endpoint]),
                        marketMakerAccount).then((liquidityPoolAccount) => {
                            let registerMarketMakerTx = context.program.rpc.registerMarketMaker(
                                bump,
                                {
                                    accounts: {
                                        optifiExchange: exchangeAddress,
                                        userAccount: userAccountAddress,
                                        marketMakerAccount: marketMakerAccount,
                                        user: context.provider.wallet.publicKey,
                                        systemProgram: SystemProgram.programId,
                                        rent: SYSVAR_RENT_PUBKEY
                                    }
                                });
                            registerMarketMakerTx.then((res) => {
                                console.log("Successfully registered market maker",
                                    formatExplorerAddress(context, res as string,
                                        SolanaEntityType.Transaction));
                                resolve({
                                    successful: true,
                                    data: res as TransactionSignature
                                })
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