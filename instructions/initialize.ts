import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {Exchange} from "../types/optifi-exchange-types";
import * as anchor from "@project-serum/anchor";
import {findExchangeAccount} from "../utils/accounts";
import {SystemProgram, SYSVAR_RENT_PUBKEY, Transaction} from "@solana/web3.js";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";
import {signAndSendTransaction} from "../utils/transactions";

/**
 * Create a new optifi exchange - the first instruction that will be run in the Optifi system
 *
 * @param context The program context
 * @param uuid Optionally supply the UUID of the new exchange to create. One will be generated if not specified.
 */
export default function initialize(context: Context, uuid?: string): Promise<InstructionResult<string>> {
    let exchangeUuid = uuid || anchor.web3.Keypair.generate()
        .publicKey.toBase58()
        .slice(0, 6);
    return new Promise((resolve, reject) => {

        findExchangeAccount(context, exchangeUuid).then(async ([exchangeAddress, bump]) => {
            context.connection.getRecentBlockhash().then((recentBlockhash) => {
                let initializeTx = context.program.transaction.initialize(
                    bump,
                    {
                        uuid: uuid,
                        version: 1,
                        exchangeAuthority: context.provider.wallet.publicKey,
                        owner: context.provider.wallet.publicKey,
                        markets: [],
                        instruments: [],
                    },
                    {
                        accounts: {
                            optifiExchange: exchangeAddress,
                            authority: context.provider.wallet.publicKey,
                            payer: context.provider.wallet.publicKey,
                            systemProgram: anchor.web3.SystemProgram.programId,
                            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                        },
                        signers: [],
                    },
                )
                initializeTx.recentBlockhash = recentBlockhash.blockhash;
                initializeTx.feePayer = context.provider.wallet.publicKey;
                signAndSendTransaction(context, initializeTx).then((res) => {
                    let txUrl = formatExplorerAddress(context, res.txId as string, SolanaEntityType.Transaction);
                    console.log("Successfully created exchange, ", txUrl);
                    resolve({
                        successful: true,
                        data: uuid
                    })
                }).catch((err) => {
                    console.error(err);
                    reject({
                        successful: false,
                        error: err
                    } as InstructionResult<any>);
                })
            }).catch((err) => {
                console.error(err);
                reject(err);
            });
        })
    });
}