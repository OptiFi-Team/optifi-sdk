import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, getDexOpenOrders } from "../../utils/accounts";
import { AmmAccount, OptifiMarket } from "../../types/optifi-exchange-types";
import { MANGO_GROUP_ID, MANGO_PROGRAM_ID, SERUM_DEX_PROGRAM_ID } from "../../constants";
import { findInstrumentIndexFromAMM } from "../../utils/amm";
import { findAssociatedTokenAccount } from "../../utils/token";
import { signAndSendTransaction, TransactionResultType } from "../../utils/transactions";
import { getAmmLiquidityAuthPDA, getMangoAccountPDA } from "../../utils/pda";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {} from "@blockworks-foundation/mango-client";

export default function ammSyncFuturesPositions(context: Context,
    ammAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
                    context.program.account.ammAccount.fetch(ammAddress).then(async (ammRes) => {
                        try {
                            // @ts-ignore
                            let amm = ammRes as AmmAccount;
                            let [ammLiquidityAuth,] = await getAmmLiquidityAuthPDA(context);

                            // prepare the mango account for amm
                            let mangoProgramId = new PublicKey(MANGO_PROGRAM_ID[context.endpoint])
                            let mangoGroup = new PublicKey(MANGO_GROUP_ID[context.endpoint])
                            let [ammMangoAccountAddress,] = await getMangoAccountPDA(mangoProgramId, mangoGroup, ammLiquidityAuth, amm.ammIdx)
                            console.log("ammMangoAccountAddress: ", ammMangoAccountAddress.toString())

                            context.program.rpc.ammSyncFuturePositions(
                                {
                                    accounts: {
                                        optifiExchange: exchangeAddress,
                                        amm: ammAddress,
                                        mangoProgram: mangoProgramId,
                                        mangoGroup: mangoGroup,
                                        mangoAccount: ammMangoAccountAddress,
                                        owner: ammLiquidityAuth,
                                        mangoCache: ammLiquidityAuth,
                                        rootBank: new PublicKey("HUBX4iwWEUK5VrXXXcB7uhuKrfT4fpu2T9iZbg712JrN"),
                                        nodeBank: new PublicKey("J2Lmnc1e4frMnBEJARPoHtfpcohLfN67HdK1inXjTFSM"),
                                        vault: new PublicKey("J2Lmnc1e4frMnBEJARPoHtfpcohLfN67HdK1inXjTFSM"), // todo
                                        ownerTokenAccount: amm.quoteTokenVault,
                                        payer: context.provider.wallet.publicKey,
                                        tokenProgram: TOKEN_PROGRAM_ID
                                    }
                                }
                            ).then((syncRes) => {
                                resolve({
                                    successful: true,
                                    data: syncRes as TransactionSignature
                                })
                            }).catch((err) => {
                                console.error(err);
                                reject(err);
                            })
                        } catch (err) {
                            reject(err)
                        }
                    }).catch((err) => reject(err))
                    // }).catch((err) => reject(err))
                    // }).catch((err) => reject(err))
                    // }).catch((err) => reject(err))
                    // })
                    // .catch((err) => reject(err))
                }).catch((err) => reject(err))
    })
}