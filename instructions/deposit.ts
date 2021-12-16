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
    return new Promise(async (resolve, reject) => {
        const [exists, userAccount] = await userAccountExists(context);

        if(!exists) reject({
            successful: false,
            error: "User account does not exist"
        } as InstructionResult<any>) 

        const acc = await context.program.account.userAccount.fetch(context.user.publicKey);
        
        if(!acc || amount > acc.reserve) reject({
            successful: false,
            error: "User account does not have enough reserve for deposit"
        } as InstructionResult<any>) 

        context.program.rpc.deposit(amount, {
            accounts: {
            userAccount: account,
            depositTokenMint: USDC_TOKEN_MINT, 
            depositSource: /* user_usdc_token_account */context.user.publicKey, 
            userVaultOwnedByPda: userAccount.userVaultOwnedByPda.toString(),
            depositor: context.user.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            },
            signers: [context.user],
            instructions: [],
        }).then((tx) => {
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
    });
};

