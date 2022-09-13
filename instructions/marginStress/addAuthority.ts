import Context from "../../types/context";
import { PublicKey, TransactionInstruction, TransactionSignature } from "@solana/web3.js";
import { findMarginStressWithAsset } from "../../utils/margin";
import { findExchangeAccount } from "../../utils/accounts";
import { SUPPORTED_ASSETS } from "../../constants";
import InstructionResult from "../../types/instructionResult";

export default function addAuthority(context: Context, newAuthority: PublicKey):
    Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        try {
            let [exchangeAddress, _] = await findExchangeAccount(context);

            let instructions: TransactionInstruction[] = []

            for await (let asset of SUPPORTED_ASSETS) {

                let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, asset);

                console.log(asset);

                if (asset == SUPPORTED_ASSETS[SUPPORTED_ASSETS.length - 1]) {
                    let res = await context.program.rpc.addAuthority(
                        newAuthority,
                        {
                            accounts: {
                                marginStressAccount: marginStressAddress,
                                signer: context.provider.wallet.publicKey,
                            },
                            instructions: instructions
                        },
                    );
                    resolve({
                        successful: true,
                        data: res as TransactionSignature
                    })
                }
                else {
                    let ix = context.program.instruction.addAuthority(
                        newAuthority,
                        {
                            accounts: {
                                marginStressAccount: marginStressAddress,
                                signer: context.provider.wallet.publicKey,
                            },
                        }
                    );
                    instructions.push(ix);
                }
            }
        } catch (e) {
            console.error(e);
            reject(e)
        }
    })
}