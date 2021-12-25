import * as anchor from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import { OrderSide } from "../types/optifi-exchange-types";
import {findOptifiExchange, findPDA, findUserAccount, getDexOpenOrders, userAccountExists} from "../utils/accounts";
import { formatExplorerAddress, SolanaEntityType } from "../utils/debug";
import { getMarketInfo } from "../utils/market";

/**
 * Initialize a new open orders account for user to place order on the optifi market
 * @param context
 * @param order ask or bid
 */
 export default async function newOrder(context: Context, order: OrderSide) : Promise<InstructionResult<string>> {
    return new Promise( (resolve, reject) => {
            userAccountExists(context).then(([exists, userAccount]) => {
                if(!exists || !userAccount) reject({
                    successful: false,
                    error: "User account does not exist"
                } as InstructionResult<any>)

                findPDA(context).then(([pda, _bump]) => {
                    findOptifiExchange(context).then(([exchangeAddress, bump]) => {
                        getMarketInfo(context).then((marketAccountInfo) => {
                            context.program.rpc.placeOrder(
                                order, // sell
                                new anchor.BN(1), // limit price
                                new anchor.BN(1), // max amount of coins currency to sell = 8 * coinLotSize, coinLotSize is defined when serum market is created
                                new anchor.BN(1), // max amount of price currency to recieve??  = 4 * pcLotSize, while pcLotSize is defined when serum market is created
                                {
                                  accounts: {
                                    exchange: exchangeAddress,
                                    user: context.user.publicKey,
                                    userMarginAccount: new PublicKey(
                                      "BuwbeUkmKU2S3hPccxFnGnvjEp5RuQK9JFHVLwp8yt8k"
                                    ),
                                    userInstrumentSplAccount: userCoinTokenAccount,
                                    optifiMarket: new PublicKey(
                                      "9pgtcXRUfs9QbsZXBTSCtuMdZGkDabPRR6oFhgBkGXTM"
                                    ),
                                    serumMarket: marketAddress,
                                    openOrders: openOrdersAccount,
                                    openOrdersOwner: pda,
                                    requestQueue: marketAccountInfo.decoded.requestQueue,
                                    eventQueue: marketAccountInfo.decoded.eventQueue,
                                    bids: marketAccountInfo.decoded.bids,
                                    asks: marketAccountInfo.decoded.asks,
                                    coinMint: marketAccountInfo.decoded.baseMint,
                                    coinVault: marketAccountInfo.decoded.baseVault,
                                    pcVault: marketAccountInfo.decoded.quoteVault,
                                    vaultSigner: context.user.publicKey, // not used
                                    orderPayerTokenAccount: context.user.publicKey, // the (coin or price currency) account paying for the order: ;
                                    tokenProgram: TOKEN_PROGRAM_ID,
                                    //   marketAuthority: myWallet.publicKey,
                                    pda: pda,
                                    serumDexProgramId: new PublicKey("DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY"),
                                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                                  },
                                }
                              ).then((tx) => {
                                let txUrl = formatExplorerAddress(context, tx, SolanaEntityType.Transaction);
                                console.log("Successfully placed order", txUrl);
                                resolve({
                                    successful: true,
                                    data: txUrl,
                                })
                            }).catch((err) => {
                                console.error("Got error trying to place order", err);
                                reject(err);
                            })
                        })
                    })
                })
            });
    });
};

