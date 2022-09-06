import * as anchor from "@project-serum/anchor";
import Context from "../types/context";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findUserAccount, findUserUSDCAddress, userAccountExists } from "../utils/accounts";
import { OPUSDC_TOKEN_MINT } from "../constants";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { signAndSendTransaction, TransactionResultType } from "../utils/transactions";
import InstructionResult from "../types/instructionResult";
import { UserAccount } from "../types/optifi-exchange-types";


export default function withdraw(context: Context,
    amount: number, acct: UserAccount): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        let acctExists = true;
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findUserAccount(context).then(([userAccountAddress, _]) => {
                if (acctExists && acct !== undefined) {
                    findUserUSDCAddress(context).then(([userUSDCAddress, _]) => {
                        context.connection.getTokenAccountBalance(acct.userMarginAccountUsdc).then(tokenAmount => {
                            console.log("userMarginAccountUsdc: ", acct.userMarginAccountUsdc.toString());
                            console.log("balance: ", tokenAmount.value.uiAmount);
                            context.program.rpc.withdraw(
                                new anchor.BN(amount * (10 ** tokenAmount.value.decimals)),
                                {
                                    accounts: {
                                        optifiExchange: exchangeAddress,
                                        userAccount: userAccountAddress,
                                        userMarginAccountUsdc: acct.userMarginAccountUsdc,
                                        withdrawDest: userUSDCAddress,
                                        user: context.provider.wallet.publicKey,
                                        tokenProgram: TOKEN_PROGRAM_ID
                                    }
                                }
                            ).then((res) => {
                                resolve({
                                    successful: true,
                                    data: res as TransactionSignature
                                })
                            }).catch((err) => reject(err))
                        }).catch((err) => reject(err));
                    }).catch((err) => reject(err));
                } else {
                    console.error("Account didn't exist ", userAccountAddress);
                    reject(userAccountAddress);
                }
            }).catch((err) => reject(err));
        }).catch((err) => reject(err));
    })
}
