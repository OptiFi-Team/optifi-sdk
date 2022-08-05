import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import { PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY, SYSVAR_RENT_PUBKEY, Transaction, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findOracleAccountFromAsset, OracleAccountType } from "../utils/accounts";
import { AmmAccount, Asset as OptifiAsset } from "../types/optifi-exchange-types";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { increaseComputeUnitsIx, signAndSendTransaction, TransactionResultType } from "../utils/transactions";
import { numberToOptifiAsset } from "../utils/generic";
import { findMarginStressWithAsset } from "../utils/margin";
import marginStress from "./marginStress";

export default function calculateAmmDelta(context: Context,
    ammAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.ammAccount.fetch(ammAddress).then(async (ammRes) => {
                // @ts-ignore
                let amm = ammRes as AmmAccount;
                let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, amm.asset)

                let tx = new Transaction()
                let updateMarginStressInx = await marginStress(context, amm.asset);
                tx.add(increaseComputeUnitsIx)
                tx.add(...updateMarginStressInx)
                let updateMarginStressTx = await context.provider.sendAndConfirm(tx);
                console.log("updateMarginStressTx: ", updateMarginStressTx as TransactionSignature)
                let instructions = [increaseComputeUnitsIx]

                context.program.rpc.ammCalculateDelta({
                    accounts: {
                        // optifiExchange: exchangeAddress,
                        marginStressAccount: marginStressAddress,
                        amm: ammAddress,
                        quoteTokenVault: amm.quoteTokenVault,
                        lpTokenMint: amm.lpTokenMint
                        // tokenProgram: TOKEN_PROGRAM_ID,
                        // clock: SYSVAR_CLOCK_PUBKEY,
                        // assetFeed: spotOracle,
                        // usdcFeed: usdcSpotOracle,
                        // ivFeed: ivOracle
                    },
                    instructions
                })
                    .then((calculateRes) => {
                        resolve({
                            successful: true,
                            data: calculateRes as TransactionSignature
                        })
                    }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}

