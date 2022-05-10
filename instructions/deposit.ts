import * as anchor from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import { UserAccount } from "../types/optifi-exchange-types";
import { findUserAccount, findUserUSDCAddress } from "../utils/accounts";
import { signAndSendTransaction, TransactionResultType } from "../utils/transactions";

export default function deposit(context: Context, amount: number, userAccount: UserAccount): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        let acctExists = true;
        findUserAccount(context).then(([userAccountAddress, _]) => {
            if (acctExists && userAccount !== undefined) {
                findUserUSDCAddress(context).then(([userUSDCAddress, _]) => {
                    context.connection.getTokenAccountBalance(userUSDCAddress).then(tokenAmount => {
                        console.log("User USDC address is", userUSDCAddress.toString());
                        console.log("balance: ", tokenAmount.value.uiAmount);
                        let depositTx = context.program.transaction.deposit(
                            new anchor.BN(amount * (10 ** tokenAmount.value.decimals)),
                            {
                                accounts: {
                                    userAccount: userAccountAddress,
                                    userMarginAccountUsdc: userAccount.userMarginAccountUsdc,
                                    depositSource: userUSDCAddress,
                                    user: context.provider.wallet.publicKey,
                                    tokenProgram: TOKEN_PROGRAM_ID
                                }
                            }
                        )
                        signAndSendTransaction(context, depositTx).then((res) => {
                            if (res.resultType === TransactionResultType.Successful) {
                                resolve({
                                    successful: true,
                                    data: res.txId as TransactionSignature
                                });
                            } else {
                                console.error(res);
                                reject(res);
                            }
                        }).catch((err) => reject(err));
                    }).catch((err) => reject(err));
                }).catch((err) => reject(err));
            } else {
                console.error("User account did not exist at ", userAccountAddress);
                reject(userAccountAddress);
            }

        }).catch((err) => reject(err));
    })
}