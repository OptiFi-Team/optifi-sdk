import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {Exchange} from "../types/optifi-exchange-types";
import * as anchor from "@project-serum/anchor";
import {findExchangeAccount} from "../utils/accounts";
import {SystemProgram, SYSVAR_RENT_PUBKEY} from "@solana/web3.js";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";

export default function Initialize(context: Context): Promise<InstructionResult<Exchange>> {
    return new Promise((resolve, reject) => {
        let uuid = anchor.web3.Keypair.generate()
            .publicKey.toBase58()
            .slice(0, 6);
        findExchangeAccount(context, uuid).then(([exchangeAddress, bump]) => {
            context.program.rpc.initialize(
                bump,
                {
                    uuid: uuid,
                    version: 1,
                    exchangeAuthority: context.user.publicKey,
                    owner: context.user.publicKey,
                    markets: [],
                    instruments: [],
                },
                {
                    accounts: {
                        optifiExchange: exchangeAddress,
                        authority: context.user.publicKey,
                        payer: context.user.publicKey,
                        systemProgram: anchor.web3.SystemProgram.programId,
                        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                    },
                    signers: [context.user],
                }
            ).then((res) => {
                let txUrl = formatExplorerAddress(context, res, SolanaEntityType.Transaction);
                console.log("Successfully created exchange, ", txUrl);
                context.program.account.exchange.fetch(
                    exchangeAddress
                ).then((res) => {
                    console.log("Res is", res);
                    resolve({
                        successful: true,
                        data: res as Exchange
                    })
                }).catch((err) => {
                    console.error(err);
                    reject({
                        successful: false,
                        error: "Exchange didn't exist after initialization"
                    } as InstructionResult<any>);
                })
            }).catch((err) => {
                console.error(err);
                reject({
                    successful: false,
                    error: err
                } as InstructionResult<any>);
            })
        })
    });
}