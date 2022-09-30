import Context from "../../types/context";
import { TransactionInstruction, TransactionSignature } from "@solana/web3.js";
import { findMarginStressWithAsset } from "../../utils/margin";
import { findExchangeAccount } from "../../utils/accounts";
import * as anchor from "@project-serum/anchor";
import { SUPPORTED_ASSETS } from "../../constants";
import InstructionResult from "../../types/instructionResult";
import { getGvolIV } from "../../utils/getGvolIV";

export default function updateIv(context: Context):
    Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        try {
            let [exchangeAddress, _] = await findExchangeAccount(context);

            let instructions: TransactionInstruction[] = []

            for await (let asset of SUPPORTED_ASSETS) {

                let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, asset);

                let marginStressAccount = await context.program.account.marginStressAccount.fetch(marginStressAddress);

                let [iv, now] = await getGvolIV(asset, marginStressAccount.expiryDate[0] * 1000)

                if (asset == SUPPORTED_ASSETS[SUPPORTED_ASSETS.length - 1]) {
                    let res = await context.program.rpc.updateIv(
                        iv,
                        new anchor.BN(now),
                        {
                            accounts: {
                                optifiExchange: exchangeAddress,
                                marginStressAccount: marginStressAddress,
                                signer: context.provider.wallet.publicKey,
                            },
                            instructions: instructions
                        }
                    );

                    resolve({
                        successful: true,
                        data: res as TransactionSignature
                    })
                }
                else {
                    let ix = context.program.instruction.updateIv(
                        iv,
                        new anchor.BN(now),
                        {
                            accounts: {
                                optifiExchange: exchangeAddress,
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