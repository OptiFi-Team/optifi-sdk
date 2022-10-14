import Context from "../types/context";
import { PublicKey, TransactionInstruction, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";
import { findExchangeAccount } from "../utils/accounts";
import { AmmAccount } from "../types/optifi-exchange-types";
import { findMarginStressWithAsset } from "../utils/margin";
import marginStress from "./marginStress/marginStress";
import { increaseComputeUnitsIx } from "../utils/transactions";

export default function calculateAmmProposal(context: Context,
    ammAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(async ([exchangeAddress, _]) => {
            context.program.account.ammAccount.fetch(ammAddress).then(async (ammRes) => {
                // @ts-ignore
                let amm = ammRes as AmmAccount;
                let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, amm.asset)

                let instructions: TransactionInstruction[] = [increaseComputeUnitsIx]
                let updateMarginStressInx = await marginStress(context, amm.asset);
                instructions.push(...updateMarginStressInx)
                context.program.rpc.ammCalculateProposal({
                    accounts: {
                        // optifiExchange: exchangeAddress,
                        marginStressAccount: marginStressAddress,
                        amm: ammAddress,
                        // clock: SYSVAR_CLOCK_PUBKEY,
                    },
                    instructions
                }).then((calculateRes) => {
                    resolve({
                        successful: true,
                        data: calculateRes as TransactionSignature
                    })
                }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}

export function calculateAmmProposalInBatch(context: Context,
    ammAddress: PublicKey,
    ammAccount: AmmAccount,
    batchIndex: number,
    batchSize: number
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        try {
            let [exchangeAddress, _] = await findExchangeAccount(context)
            let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, ammAccount.asset)

            let inxs: TransactionInstruction[] = [increaseComputeUnitsIx]

            // add margin stress calc inx
            let updateMarginStressInx = await marginStress(context, ammAccount.asset);
            inxs.push(...updateMarginStressInx)

            for (let i = 0; i < batchSize - 1; i++) {
                inxs.push(context.program.instruction.ammCalculateProposal({
                    accounts: {
                        marginStressAccount: marginStressAddress,
                        amm: ammAddress,
                    },
                }))
            }

            let ammCalculateProposalRes = await context.program.rpc.ammCalculateProposal({
                accounts: {
                    marginStressAccount: marginStressAddress,
                    amm: ammAddress,
                },
                instructions: inxs
            })

            resolve({
                successful: true,
                data: ammCalculateProposalRes as TransactionSignature
            })
        } catch (err) { reject(err) }
    })
}