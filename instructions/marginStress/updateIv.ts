import Context from "../../types/context";
import { TransactionInstruction, TransactionSignature } from "@solana/web3.js";
import { findMarginStressWithAsset } from "../../utils/margin";
import { findExchangeAccount } from "../../utils/accounts";
import * as anchor from "@project-serum/anchor";
import { SUPPORTED_ASSETS } from "../../constants";
import { getGvolAtm7 } from "../../utils/getGvolAtm7";
import InstructionResult from "../../types/instructionResult";

export default function updateIv(context: Context):
    Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        try {
            let [exchangeAddress, _] = await findExchangeAccount(context);

            let instructions: TransactionInstruction[] = []

            SUPPORTED_ASSETS.forEach(async (asset) => {

                let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, asset);

                let iv = await getGvolAtm7(asset);

                if (asset == SUPPORTED_ASSETS[SUPPORTED_ASSETS.length - 1]) {
                    let res = await context.program.rpc.updateIv(
                        new anchor.BN(iv),
                        {
                            accounts: {
                                marginStressAccount: marginStressAddress,
                                signer: context.provider.wallet.publicKey,
                            },
                        }
                    );

                    resolve({
                        successful: true,
                        data: res as TransactionSignature
                    })
                }
                else {
                    let ix = context.program.instruction.updateIv(
                        new anchor.BN(iv),
                        {
                            accounts: {
                                marginStressAccount: marginStressAddress,
                                signer: context.provider.wallet.publicKey,
                            },
                        }
                    );
                    instructions.push(ix);
                }
            })
        } catch (e) {
            console.error(e);
            reject(e)
        }
    })
}