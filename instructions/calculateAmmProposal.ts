import Context from "../types/context";
import {PublicKey, SYSVAR_CLOCK_PUBKEY, TransactionSignature} from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";
import {findExchangeAccount, findOracleAccountFromAsset, OracleAccountType} from "../utils/accounts";
import {Amm} from "../types/optifi-exchange-types";
import {TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";

export default function calculateAmmProposal(context: Context,
                                             ammAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.amm.fetch(ammAddress).then((ammRes) => {
                // @ts-ignore
                let amm = ammRes as Amm;

                let spotOracle = findOracleAccountFromAsset(context, amm.asset);
                let ivOracle = findOracleAccountFromAsset(context, amm.asset, OracleAccountType.Iv);

                let calculateProposalTx = context.program.transaction.ammCalculateProposal({
                    accounts: {
                        optifiExchange: exchangeAddress,
                        amm: ammAddress,
                        quoteTokenVault: amm.quoteTokenVault,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        clock: SYSVAR_CLOCK_PUBKEY,
                        spotOracle: spotOracle,
                        ivOracle: ivOracle
                    }
                });
                signAndSendTransaction(context, calculateProposalTx).then((calculateRes) => {
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