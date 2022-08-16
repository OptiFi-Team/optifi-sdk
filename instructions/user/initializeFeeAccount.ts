import Context from "../../types/context";
import { PublicKey, SystemProgram, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../../types/instructionResult";
import { findAccountWithSeeds, findExchangeAccount, findUserAccount } from "../../utils/accounts";


export default function initializeFeeAccount(context: Context, userAccountAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(async ([exchangeAddress, _]) => {

            let [feeAccount,] = await findUserFeeAccount(context, exchangeAddress, userAccountAddress)


            console.log("userAccountAddress: ", userAccountAddress.toString())
            console.log("feeAccount: ", feeAccount.toString())


            context.program.rpc.initializeFeeAccount(
                {
                    accounts: {
                        optifiExchange: exchangeAddress,
                        userAccount: userAccountAddress,
                        feeAccount: feeAccount,
                        payer: context.provider.wallet.publicKey,
                        systemProgram: SystemProgram.programId,
                    }
                }).then((res) => {
                    resolve({
                        successful: true,
                        data: res as TransactionSignature
                    })
                }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}


export function findUserFeeAccount(context: Context, exchangeAddress: PublicKey, userAccount: PublicKey)
    : Promise<[PublicKey, number]> {
    return findAccountWithSeeds(context, [
        Buffer.from("fee_account"),
        exchangeAddress.toBuffer(),
        userAccount.toBuffer()
    ])
}
