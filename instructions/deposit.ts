import * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { USDC_TOKEN_MINT } from "../constants";
import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import { UserAccount } from "../types/optifi-exchange-types";
import { userAccountExists } from "../utils/accounts";
import { formatExplorerAddress, SolanaEntityType } from "../utils/debug";

/**
 * Make deposit
 *
 * @param context
 * @param amount
 * @param account
 */
 export default async function deposit(context: Context, amount: BN, account: PublicKey) : Promise<InstructionResult<string>> {
    return new Promise( (resolve, reject) => {
        userAccountExists(context).then(([exists, userAccount]) => {
            console.log("Got user account in deposit ", userAccount);
            if(!exists) reject({
                successful: false,
                error: "User account does not exist"
            } as InstructionResult<any>)

            context.program.rpc.deposit(amount, {
                accounts: {
                    userAccount: account,
                    depositTokenMint: new PublicKey(USDC_TOKEN_MINT[context.endpoint]),
                    depositSource: /* user_usdc_token_account */context.user.publicKey,
                    userVaultOwnedByPda: userAccount.userVaultOwnedByPda,
                    depositor: context.user.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                },
                signers: [context.user],
                instructions: [],
            }).then((tx) => {
                console.log("After deposit");
                let txUrl = formatExplorerAddress(context, tx, SolanaEntityType.Transaction);
                console.log("Successfully deposited, ", txUrl);
                resolve({
                    successful: true,
                    data: txUrl,
                })
            }).catch((err) => {
                console.error("Got error trying to deposit", err);
                reject(err);
            })
        }).catch((err) => {
            console.error(err);
            reject(err);
        });
        })

};

