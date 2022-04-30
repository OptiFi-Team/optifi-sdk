import Context from "../types/context";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, TransactionInstruction, TransactionSignature } from "@solana/web3.js";
import InstructionResult from "../types/instructionResult";
import { findExchangeAccount } from "../utils/accounts";
import { AmmAccount } from "../types/optifi-exchange-types";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { signAndSendTransaction, TransactionResultType } from "../utils/transactions";
import * as anchor from "@project-serum/anchor";
import { findMarginStressWithAsset } from "../utils/margin";
import marginStress from "./marginStress";

export default function calculateAmmProposal(context: Context,
    ammAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(async ([exchangeAddress, _]) => {
            context.program.account.ammAccount.fetch(ammAddress).then(async (ammRes) => {
                // @ts-ignore
                let amm = ammRes as AmmAccount;
                let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, amm.asset)

                let updateMarginStressInx = await marginStress(context, amm.asset);
                context.program.rpc.ammCalculateProposal({
                    accounts: {
                        // optifiExchange: exchangeAddress,
                        marginStressAccount: marginStressAddress,
                        amm: ammAddress,
                        // clock: SYSVAR_CLOCK_PUBKEY,
                    },
                    instructions: updateMarginStressInx
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