import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import { PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY, SYSVAR_RENT_PUBKEY, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findOracleAccountFromAsset, OracleAccountType } from "../utils/accounts";
import { AmmAccount, Asset as OptifiAsset } from "../types/optifi-exchange-types";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { signAndSendTransaction, TransactionResultType } from "../utils/transactions";
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
                // let spotOracle = findOracleAccountFromAsset(context, numberToOptifiAsset(amm.asset));
                // let ivOracle = findOracleAccountFromAsset(context, numberToOptifiAsset(amm.asset), OracleAccountType.Iv);
                // let usdcSpotOracle = findOracleAccountFromAsset(context, OptifiAsset.USDC, OracleAccountType.Spot);
                let [marginStressAddress, _bump] = await findMarginStressWithAsset(context, exchangeAddress, amm.asset)

                let updateMarginStressInx = await marginStress(context, amm.asset);

                context.program.rpc.ammCalculateDelta({
                    accounts: {
                        // optifiExchange: exchangeAddress,
                        marginStressAccount: marginStressAddress,
                        amm: ammAddress,
                        quoteTokenVault: amm.quoteTokenVault,
                        // tokenProgram: TOKEN_PROGRAM_ID,
                        // clock: SYSVAR_CLOCK_PUBKEY,
                        // assetFeed: spotOracle,
                        // usdcFeed: usdcSpotOracle,
                        // ivFeed: ivOracle
                    },
                    instructions: updateMarginStressInx
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


export function initAmmParamsAccount(context: Context,
    ammAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.ammAccount.fetch(ammAddress).then(async (ammRes) => {
                // let a = context.connection.getAccountInfo(ammParamsPDA)
                // let inx

                // context.program.rpc.ammCalculateDelta({
                //     accounts: {
                //         optifiExchange: exchangeAddress,
                //         amm: ammAddress,
                //         quoteTokenVault: amm.quoteTokenVault,
                //         tokenProgram: TOKEN_PROGRAM_ID,
                //         clock: SYSVAR_CLOCK_PUBKEY,
                //         assetFeed: spotOracle,
                //         usdcFeed: usdcSpotOracle,
                //         ivFeed: ivOracle
                //     }
                // })

                // context.program.rpc.createAmmParams(
                //     bump,
                //     {
                //         accounts: {
                //             optifiExchange: exchangeAddress,
                //             amm: ammAddress,
                //             params: ammParamsPDA,
                //             payer: context.provider.wallet.publicKey,
                //             systemProgram: SystemProgram.programId,
                //             rent: SYSVAR_RENT_PUBKEY
                //         }
                //     }).then((calculateRes) => {
                //         resolve({
                //             successful: true,
                //             data: calculateRes as TransactionSignature
                //         })
                //     }).catch((err) => reject(err))
            }).catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}