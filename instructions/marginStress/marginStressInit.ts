import Context from "../../types/context";
import { SystemProgram, SYSVAR_RENT_PUBKEY, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../../types/instructionResult";
import Asset from "../../types/asset";
import { findMarginStressWithAsset } from "../../utils/margin";
import { findExchangeAccount } from "../../utils/accounts";
import { assetToOptifiAsset, optifiAssetToNumber } from "../../utils/generic";

export default function marginStressInit(context: Context,
    asset: Asset
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {

        let [exchangeAddress, _] = await findExchangeAccount(context);

        let optifiAsset = assetToOptifiAsset(asset);

        let [marginStressAddress, bump] = await findMarginStressWithAsset(context, exchangeAddress, optifiAssetToNumber(optifiAsset));

        context.program.rpc.marginStressInit(
            bump,
            optifiAssetToNumber(optifiAsset),
            {
                accounts: {
                    optifiExchange: exchangeAddress,
                    marginStressAccount: marginStressAddress,
                    payer: context.provider.wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                    rent: SYSVAR_RENT_PUBKEY
                },
            }
        ).then((res) => {
            resolve({
                successful: true,
                data: res as TransactionSignature
            })
        }).catch((err) => reject(err))
    })
}