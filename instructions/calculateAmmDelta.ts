import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {PublicKey, SYSVAR_CLOCK_PUBKEY, TransactionSignature} from "@solana/web3.js";
import {findExchangeAccount, findOracleAccountFromAsset, OracleAccountType} from "../utils/accounts";
import {Amm, Asset as OptifiAsset} from "../types/optifi-exchange-types";
import {TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";
import {numberToOptifiAsset} from "../utils/generic";

export default function calculateAmmDelta(context: Context,
                                          ammAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.amm.fetch(ammAddress).then((ammRes) => {
                // @ts-ignore
                let amm = ammRes as Amm;
                let spotOracle = findOracleAccountFromAsset(context, numberToOptifiAsset(amm.asset));
                let ivOracle = findOracleAccountFromAsset(context, numberToOptifiAsset(amm.asset), OracleAccountType.Iv);
                let usdcSpotOracle = findOracleAccountFromAsset(context, OptifiAsset.USDC, OracleAccountType.Spot);

                let calculateDeltaTx = context.program.transaction.ammCalculateDelta({
                    accounts: {
                        optifiExchange: exchangeAddress,
                        amm: ammAddress,
                        quoteTokenVault: amm.quoteTokenVault,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        clock: SYSVAR_CLOCK_PUBKEY,
                        assetFeed: spotOracle,
                        usdcFeed: usdcSpotOracle,
                        ivFeed: ivOracle
                    }
                });
                signAndSendTransaction(context, calculateDeltaTx).then((calculateRes) => {
                    if (calculateRes.resultType === TransactionResultType.Successful) {
                        resolve({
                            successful: true,
                            data: calculateRes.txId as TransactionSignature
                        })
                    } else {
                        console.error(calculateRes);
                        reject(calculateRes);
                    }
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}