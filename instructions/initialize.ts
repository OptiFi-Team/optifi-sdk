import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import * as anchor from "@project-serum/anchor";
import {findExchangeAccount} from "../utils/accounts";
import {
    Keypair,
    PublicKey,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    Transaction,
    TransactionSignature
} from "@solana/web3.js";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";
import {signAndSendTransaction, TransactionResult, TransactionResultType} from "../utils/transactions";
import {findOptifiUSDCPoolAuthPDA} from "../utils/pda";
import {AccountLayout, Token, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {SWITCHBOARD, USDC_TOKEN_MINT} from "../constants";

function createUSDCPoolAccount(context: Context,
                               poolAuthPDAAddress: PublicKey,
                               usdcCentralPoolWallet: Keypair): Promise<TransactionResult> {
    return new Promise((resolve, reject) => {
        context.connection.getMinimumBalanceForRentExemption(AccountLayout.span).then((min) => {
            let poolTx = new Transaction();
            poolTx.add(
                SystemProgram.createAccount({
                    fromPubkey: context.provider.wallet.publicKey,
                    newAccountPubkey: usdcCentralPoolWallet.publicKey,
                    lamports: min,
                    space: AccountLayout.span,
                    programId: TOKEN_PROGRAM_ID
                }),
                Token.createInitAccountInstruction(
                    TOKEN_PROGRAM_ID,
                    new PublicKey(USDC_TOKEN_MINT[context.endpoint]),
                    usdcCentralPoolWallet.publicKey,
                    poolAuthPDAAddress
                )
            )
            signAndSendTransaction(context, poolTx, [usdcCentralPoolWallet])
                .then((res) => {
                    if (res.resultType === TransactionResultType.Successful) {
                        console.debug("Created USDC pool")
                        resolve(res);
                    } else {
                        console.error("Pool initialization was not successful", res);
                        reject(res);
                    }
                }).catch((err) => reject(err))
        })
    })
}

/**
 * Create a new optifi exchange - the first instruction that will be run in the Optifi system
 *
 * @param context The program context
 */
export default function initialize(context: Context): Promise<InstructionResult<TransactionSignature>> {

    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, bump]) => {
            findOptifiUSDCPoolAuthPDA(context).then(([poolAuthPDAAddress, poolBump]) => {
                const usdcCentralPoolWallet = anchor.web3.Keypair.generate();
                    createUSDCPoolAccount(context, poolAuthPDAAddress, usdcCentralPoolWallet).then((res) => {
                        try {
                            console.log(formatExplorerAddress(context, res.txId as string, SolanaEntityType.Transaction));
                            let initializeTx = context.program.transaction.initialize(
                                bump,
                                {
                                    uuid: context.exchangeUUID,
                                    version: 1,
                                    exchangeAuthority: context.provider.wallet.publicKey,
                                    owner: context.provider.wallet.publicKey,
                                    usdcMint: new PublicKey(USDC_TOKEN_MINT[context.endpoint]),
                                    ethSpotOracle: new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_USD),
                                    btcIvOracle: new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_IV),
                                    ethIvOracle: new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_IV),
                                    btcSpotOracle: new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD)
                                },
                                {
                                    accounts: {
                                        optifiExchange: exchangeAddress,
                                        authority: context.provider.wallet.publicKey,
                                        usdcCentralPool: usdcCentralPoolWallet.publicKey,
                                        payer: context.provider.wallet.publicKey,
                                        systemProgram: SystemProgram.programId,
                                        rent: SYSVAR_RENT_PUBKEY
                                    }
                                },
                            );
                            console.debug("Dispatching initialization transaction");
                            signAndSendTransaction(context, initializeTx).then((res) => {
                                let txUrl = formatExplorerAddress(context, res.txId as string, SolanaEntityType.Transaction);
                                console.log("Successfully created exchange, ", txUrl);
                                resolve({
                                    successful: true,
                                    data: context.exchangeUUID
                                })
                            }).catch((err) => {
                                console.error(err);
                                reject({
                                    successful: false,
                                    error: err
                                } as InstructionResult<any>);
                            })
                        }
                        catch(e) {
                            console.error("Got error while trying to initialize instructions ", e);
                            reject(e)
                        }
                    }).catch((err) => reject(err))
                })
        }).catch((err) => {
            console.error(err);
            reject(err);
        })
    });
}