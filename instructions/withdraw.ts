import * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { USDC_TOKEN_MINT } from "../constants";
import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import { UserAccount } from "../types/optifi-exchange-types";
import { findOptifiExchange, findPDA, userAccountExists } from "../utils/accounts";
import { formatExplorerAddress, SolanaEntityType } from "../utils/debug";

/**
 * Make withdraw
 * @param context
 * @param amount
 */
 export default async function withdraw(context: Context, amount: BN, account: PublicKey) : Promise<InstructionResult<string>> {
    return new Promise(async (resolve, reject) => {
        const [exists, userAccount] = await userAccountExists(context);

        if(!exists) reject({
            successful: false,
            error: "User account does not exist"
        } as InstructionResult<any>)
        
        let [pda, _bump] = await findPDA(context);
        const [exchangeAddress, bump] = await findOptifiExchange(context);

          context.program.rpc.withdraw(amount, {
            accounts: {
                optifiExchange: exchangeAddress,
                userAccount: account,
                depositTokenMint: USDC_TOKEN_MINT,
                userVaultOwnedByPda: userAccount.userVaultOwnedByPda.toString(),
                withdrawDest: context.user.publicKey,
                depositor: context.user.publicKey,
                pda: pda,
                tokenProgram: TOKEN_PROGRAM_ID,
              },
              signers: [context.user],
              instructions: [],
        }).then((tx) => {
            let txUrl = formatExplorerAddress(context, tx, SolanaEntityType.Transaction);
                console.log("Successfully withdrawn, ", txUrl);
                resolve({
                    successful: true,
                    data: txUrl,
                })
        }).catch((err) => {
            console.error("Got error trying to withdraw", err);
            reject(err);
        })
    });
};

