import * as anchor from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { USDC_DECIMALS } from "../constants";
import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import { UserAccount } from "../types/optifi-exchange-types";
import { findExchangeAccount, findUserAccount, findUserUSDCAddress } from "../utils/accounts";
import { signAndSendTransaction, TransactionResultType } from "../utils/transactions";

export default function deposit(context: Context, amount: number, userAccount: UserAccount): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        let acctExists = true;
        findUserAccount(context).then(([userAccountAddress, _]) => {
            if (acctExists && userAccount !== undefined) {
                findUserUSDCAddress(context).then(([userUSDCAddress, _]) => {
                    findExchangeAccount(context).then(([exchangeAddress, _]) => {
                        let depositTx = context.program.rpc.deposit(
                            new anchor.BN(amount * (10 ** USDC_DECIMALS)),
                            {
                                accounts: {
                                    optifiExchange: exchangeAddress,
                                    userAccount: userAccountAddress,
                                    userMarginAccountUsdc: userAccount.userMarginAccountUsdc,
                                    depositSource: userUSDCAddress,
                                    user: context.provider.wallet.publicKey,
                                    tokenProgram: TOKEN_PROGRAM_ID
                                }
                            }
                        )
                        depositTx.then(res => {
                            resolve({
                                successful: true,
                                data: res as TransactionSignature
                            })
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