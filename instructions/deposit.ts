import * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { USDC_TOKEN_MINT } from "../constants";
import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import { UserAccount } from "../types/optifi-exchange-types";
import {findUserAccount, userAccountExists} from "../utils/accounts";
import { formatExplorerAddress, SolanaEntityType } from "../utils/debug";
import { signAndSendTransaction } from "../utils/transactions";

/**
 * Make deposit
 *
 * @param context
 * @param amount
 * @param account
 */
 export default async function deposit(context: Context, amount: BN) : Promise<InstructionResult<string>> {
    return new Promise( (resolve, reject) => {
        findUserAccount(context).then((userAccountAddress) => {
            userAccountExists(context).then(([exists, userAccount]) => {                
                if(!exists || !userAccount) reject({
                    successful: false,
                    error: "User account does not exist"
                } as InstructionResult<any>)
                console.log("Got user account in deposit ", userAccount);

                //console.log("User vault is ", userAccount.userVaultOwnedByPda);
                const depositTx = context.program.transaction.deposit(amount, {
                    accounts: {
                        userAccount: userAccountAddress[0],
                        depositTokenMint: new PublicKey(USDC_TOKEN_MINT[context.endpoint]),
                        depositSource: /* user_usdc_token_account */context.provider.wallet.publicKey,
                        // @ts-ignore
                        userVaultOwnedByPda: userAccount.userVaultOwnedByPda,
                        depositor: context.provider.wallet.publicKey,
                        tokenProgram: TOKEN_PROGRAM_ID,
                    },
                    signers: [],
                    instructions: [],
                })
                signAndSendTransaction(context, depositTx).then((res) => {
                    let txUrl = formatExplorerAddress(context, res.txId as string, SolanaEntityType.Transaction);
                    console.log("Successfully deposited, ", txUrl);
                    resolve({
                        successful: true,
                        data: txUrl
                    })
                }).catch((err) => {
                    console.error(err);
                    reject({
                        successful: false,
                        error: err
                    } as InstructionResult<any>);
                })
            }).catch((err) => {
                console.error(err);
                reject(err);
            });
        })
    })
};

