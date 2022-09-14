import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, OracleAccountType, findOracleAccountFromAsset } from "../../utils/accounts";
import { Asset as OptifiAsset } from "../../types/optifi-exchange-types";

export default function updateOracle(context: Context,
    asset: OptifiAsset,
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(async ([exchangeAddress, _]) => {
            let spotOracle = await findOracleAccountFromAsset(context, asset);
            let ivOracle = null // No need to save iv oracle
            context.program.rpc.updateOracle(
                asset,
                spotOracle,
                ivOracle,
                {
                    accounts: {
                        optifiExchange: exchangeAddress,
                        operationAuthority: context.provider.wallet.publicKey
                    }
                }
            ).then((res) => {
                resolve({
                    successful: true,
                    data: res as TransactionSignature
                })
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}