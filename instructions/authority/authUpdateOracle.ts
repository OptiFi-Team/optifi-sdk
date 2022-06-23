import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, OracleAccountType, findOracleAccountFromAsset } from "../../utils/accounts";
import { Asset as OptifiAsset } from "../../types/optifi-exchange-types";

export default function updateOracle(context: Context,
    asset: OptifiAsset,
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.rpc.updateOracle(
                asset,
                findOracleAccountFromAsset(context, asset),
                findOracleAccountFromAsset(context, asset, OracleAccountType.Iv),
                {
                    accounts: {
                        optifiExchange: exchangeAddress,
                        authority: context.provider.wallet.publicKey
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