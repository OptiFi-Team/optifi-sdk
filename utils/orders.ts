import Context from "../types/context";
import {
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  findExchangeAccount,
  findUserAccount,
  getDexOpenOrders,
  userAccountExists,
  findOracleAccountFromAsset,
  OracleAccountType,
} from "./accounts";
import {
  Exchange,
  OptifiMarket,
  OrderSide,
  UserAccount,
} from "../types/optifi-exchange-types";
import { deriveVaultNonce } from "./market";
import { SERUM_DEX_PROGRAM_ID } from "../constants";
import { findOptifiMarketMintAuthPDA } from "./pda";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  findAssociatedTokenAccount,
  findOrCreateAssociatedTokenAccount,
} from "./token";
import { getSerumMarket } from "./serum";
import { BN } from "@project-serum/anchor";

import { Asset as OptifiAsset } from "../types/optifi-exchange-types";
import { numberToOptifiAsset } from "../utils/generic";
import { Chain } from "../types/optifi-exchange-types";
import { findMarginStressWithAsset } from "./margin";
import Asset from "../types/asset";

export enum TxType {
  PlaceOrder = 0,
  CancelOrder = 1,
  Others = 2,
}

export interface OrderAccountContext {
  optifiExchange: PublicKey;
  user: PublicKey;
  userAccount: PublicKey;
  userMarginAccount: PublicKey;
  userInstrumentLongTokenVault: PublicKey;
  userInstrumentShortTokenVault: PublicKey;
  optifiMarket: PublicKey;
  serumMarket: PublicKey;
  openOrders: PublicKey;
  requestQueue: PublicKey;
  eventQueue: PublicKey;
  bids: PublicKey;
  asks: PublicKey;
  coinMint: PublicKey;
  coinVault: PublicKey;
  pcVault: PublicKey;
  vaultSigner: PublicKey;
  usdcCentralPool: PublicKey;
  instrumentShortSplTokenMint: PublicKey;
  serumDexProgramId: PublicKey;
  tokenProgram: PublicKey;
}

export interface PlaceOrderContext extends OrderAccountContext {
  instrumentTokenMintAuthorityPda: PublicKey;
  marginStressAccount: PublicKey
  rent: PublicKey;
  // clock: PublicKey;
}

export interface CancelOrderContext extends OrderAccountContext {
  marginStressAccount: PublicKey
}

export function formOrderContext(
  context: Context,
  marketAddress: PublicKey,
  side: OrderSide
): Promise<OrderAccountContext> {
  let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint]);
  return new Promise((resolve, reject) => {
    findExchangeAccount(context)
      .then(([exchangeAddress, _]) => {
        findUserAccount(context)
          .then(([userAccountAddress, _]) => {
            userAccountExists(context)
              .then(([acctExists, userAccount]) => {
                findOptifiMarketMintAuthPDA(context)
                  .then(([mintAuthAddress, _]) => {
                    if (acctExists && userAccount !== undefined) {
                      context.program.account.optifiMarket
                        .fetch(marketAddress)
                        .then((marketRes) => {
                          let optifiMarket = marketRes as OptifiMarket;
                          findOrCreateAssociatedTokenAccount(
                            context,
                            optifiMarket.instrumentLongSplToken,
                            userAccountAddress
                          )
                            .then((longSPLTokenVault) => {
                              findOrCreateAssociatedTokenAccount(
                                context,
                                optifiMarket.instrumentShortSplToken,
                                userAccountAddress
                              )
                                .then((shortSPLTokenVault) => {
                                  deriveVaultNonce(
                                    optifiMarket.serumMarket,
                                    serumId
                                  )
                                    .then(([vaultOwner, _]) => {
                                      getDexOpenOrders(
                                        context,
                                        optifiMarket.serumMarket,
                                        userAccountAddress
                                      )
                                        .then(([openOrdersAccount, _]) => {
                                          getSerumMarket(
                                            context,
                                            optifiMarket.serumMarket
                                          )
                                            .then((serumMarket) => {
                                              context.program.account.exchange
                                                .fetch(exchangeAddress)
                                                .then((exchangeRes) => {
                                                  let exchange =
                                                    exchangeRes as Exchange;
                                                  resolve({
                                                    optifiExchange:
                                                      exchangeAddress,
                                                    user: context.provider
                                                      .wallet.publicKey,
                                                    userAccount:
                                                      userAccountAddress,
                                                    userMarginAccount:
                                                      userAccount.userMarginAccountUsdc,
                                                    userInstrumentLongTokenVault:
                                                      longSPLTokenVault,
                                                    userInstrumentShortTokenVault:
                                                      shortSPLTokenVault,
                                                    optifiMarket: marketAddress,
                                                    serumMarket:
                                                      optifiMarket.serumMarket,
                                                    openOrders:
                                                      openOrdersAccount,
                                                    //    openOrdersOwner: userAccountAddress,
                                                    requestQueue:
                                                      serumMarket.decoded
                                                        .requestQueue,
                                                    eventQueue:
                                                      serumMarket.decoded
                                                        .eventQueue,
                                                    bids: serumMarket.bidsAddress,
                                                    asks: serumMarket.asksAddress,
                                                    coinMint:
                                                      serumMarket.decoded
                                                        .baseMint,
                                                    coinVault:
                                                      serumMarket.decoded
                                                        .baseVault,
                                                    pcVault:
                                                      serumMarket.decoded
                                                        .quoteVault,
                                                    usdcCentralPool:
                                                      exchange.usdcCentralPool,
                                                    vaultSigner: vaultOwner,
                                                    //    orderPayerTokenAccount: (side === OrderSide.Bid ? userAccount.userMarginAccountUsdc : longSPLTokenVault),
                                                    //    instrumentTokenMintAuthorityPda: mintAuthAddress,
                                                    instrumentShortSplTokenMint:
                                                      optifiMarket.instrumentShortSplToken,
                                                    serumDexProgramId: serumId,
                                                    tokenProgram:
                                                      TOKEN_PROGRAM_ID,
                                                    //    rent: SYSVAR_RENT_PUBKEY
                                                  });
                                                })
                                                .catch((err) => {
                                                  console.error(err);
                                                  reject(err);
                                                });
                                            })
                                            .catch((err) => {
                                              console.error(
                                                "Got error trying to load serum market info from ",
                                                optifiMarket.serumMarket,
                                                err
                                              );
                                              reject(err);
                                            });
                                        })
                                        .catch((err) => reject(err));
                                    })
                                    .catch((err) => reject(err));
                                })
                                .catch((err) => reject(err));
                            })
                            .catch((err) => reject(err));
                        })
                        .catch((err) => {
                          console.error(
                            "Got error trying to load Optifi market info from ",
                            marketAddress,
                            err
                          );
                          reject(err);
                        });
                    } else {
                      console.error(
                        "Couldn't resolve user account at ",
                        userAccountAddress
                      );
                      reject(userAccountAddress);
                    }
                  })
                  .catch((err) => reject(err));
              })
              .catch((err) => reject(err));
          })
          .catch((err) => reject(err));
      })
      .catch((err) => reject(err));
  });
}

export function formPlaceOrderContext(
  context: Context,
  marketAddress: PublicKey
): Promise<[PlaceOrderContext, number]> {
  let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint]);
  return new Promise((resolve, reject) => {
    findExchangeAccount(context)
      .then(([exchangeAddress, _]) => {
        findUserAccount(context)
          .then(([userAccountAddress, _]) => {
            userAccountExists(context)
              .then(([acctExists, userAccount]) => {
                findOptifiMarketMintAuthPDA(context)
                  .then(([mintAuthAddress, _]) => {
                    if (acctExists && userAccount !== undefined) {
                      context.program.account.optifiMarket
                        .fetch(marketAddress)
                        .then((marketRes) => {
                          let optifiMarket = marketRes as OptifiMarket;
                          findOrCreateAssociatedTokenAccount(
                            context,
                            optifiMarket.instrumentLongSplToken,
                            userAccountAddress
                          )
                            .then((longSPLTokenVault) => {
                              findOrCreateAssociatedTokenAccount(
                                context,
                                optifiMarket.instrumentShortSplToken,
                                userAccountAddress
                              )
                                .then((shortSPLTokenVault) => {
                                  deriveVaultNonce(
                                    optifiMarket.serumMarket,
                                    serumId
                                  )
                                    .then(([vaultOwner, _]) => {
                                      getDexOpenOrders(
                                        context,
                                        optifiMarket.serumMarket,
                                        userAccountAddress
                                      )
                                        .then(([openOrdersAccount, _]) => {
                                          getSerumMarket(
                                            context,
                                            optifiMarket.serumMarket
                                          )
                                            .then((serumMarket) => {
                                              context.program.account.chain
                                                .fetch(optifiMarket.instrument)
                                                .then((chainRes) => {
                                                  // console.log("Chain res is ", chainRes);
                                                  // @ts-ignore
                                                  let chain = chainRes as Chain;
                                                  // console.log("Chain is", chain);
                                                  context.program.account.exchange
                                                    .fetch(exchangeAddress)
                                                    .then((exchangeRes) => {
                                                      findMarginStressWithAsset(context, exchangeAddress, chain.asset).then(([marginStressAddress, _bump]) => {
                                                        let exchange =
                                                          exchangeRes as Exchange;

                                                        let result: PlaceOrderContext =
                                                        {
                                                          optifiExchange:
                                                            exchangeAddress,
                                                          user: context.provider
                                                            .wallet.publicKey,
                                                          userAccount:
                                                            userAccountAddress,
                                                          userMarginAccount:
                                                            userAccount.userMarginAccountUsdc,
                                                          userInstrumentLongTokenVault:
                                                            longSPLTokenVault,
                                                          userInstrumentShortTokenVault:
                                                            shortSPLTokenVault,
                                                          optifiMarket:
                                                            marketAddress,
                                                          serumMarket:
                                                            optifiMarket.serumMarket,
                                                          openOrders:
                                                            openOrdersAccount,
                                                          requestQueue:
                                                            serumMarket.decoded
                                                              .requestQueue,
                                                          eventQueue:
                                                            serumMarket.decoded
                                                              .eventQueue,
                                                          bids: serumMarket.bidsAddress,
                                                          asks: serumMarket.asksAddress,
                                                          coinMint:
                                                            serumMarket.decoded
                                                              .baseMint,
                                                          coinVault:
                                                            serumMarket.decoded
                                                              .baseVault,
                                                          pcVault:
                                                            serumMarket.decoded
                                                              .quoteVault,
                                                          usdcCentralPool:
                                                            exchange.usdcCentralPool,
                                                          vaultSigner:
                                                            vaultOwner,
                                                          instrumentTokenMintAuthorityPda:
                                                            mintAuthAddress,
                                                          instrumentShortSplTokenMint:
                                                            optifiMarket.instrumentShortSplToken,
                                                          serumDexProgramId:
                                                            serumId,
                                                          tokenProgram:
                                                            TOKEN_PROGRAM_ID,
                                                          rent: SYSVAR_RENT_PUBKEY,
                                                          // clock:
                                                          //   SYSVAR_CLOCK_PUBKEY,
                                                          marginStressAccount: marginStressAddress,
                                                        };
                                                        resolve([result, chain.asset]);
                                                      })
                                                        .catch((err) => {
                                                          console.error(err);
                                                          reject(err);
                                                        });
                                                    })
                                                    .catch((err) => {
                                                      console.error(err);
                                                      reject(err);
                                                    });
                                                })
                                                .catch((err) => {
                                                  console.error(err);
                                                  reject(err);
                                                });
                                            })
                                            .catch((err) => {
                                              console.error(
                                                "Got error trying to load serum market info from ",
                                                optifiMarket.serumMarket,
                                                err
                                              );
                                              reject(err);
                                            });
                                        })
                                        .catch((err) => reject(err));
                                    })
                                    .catch((err) => reject(err));
                                })
                                .catch((err) => reject(err));
                            })
                            .catch((err) => reject(err));
                        })
                        .catch((err) => {
                          console.error(
                            "Got error trying to load Optifi market info from ",
                            marketAddress,
                            err
                          );
                          reject(err);
                        });
                    } else {
                      console.error(
                        "Couldn't resolve user account at ",
                        userAccountAddress
                      );
                      reject(userAccountAddress);
                    }
                  })
                  .catch((err) => reject(err));
              })
              .catch((err) => reject(err));
          })
          .catch((err) => reject(err));
      })
      .catch((err) => reject(err));
  });
}

export function formCancelOrderContext(
  context: Context,
  marketAddress: PublicKey
): Promise<CancelOrderContext> {
  let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint]);
  return new Promise((resolve, reject) => {
    findExchangeAccount(context)
      .then(([exchangeAddress, _]) => {
        findUserAccount(context)
          .then(([userAccountAddress, _]) => {
            userAccountExists(context)
              .then(([acctExists, userAccount]) => {
                findOptifiMarketMintAuthPDA(context)
                  .then(([mintAuthAddress, _]) => {
                    if (acctExists && userAccount !== undefined) {
                      context.program.account.optifiMarket
                        .fetch(marketAddress)
                        .then((marketRes) => {
                          let optifiMarket = marketRes as OptifiMarket;
                          findOrCreateAssociatedTokenAccount(
                            context,
                            optifiMarket.instrumentLongSplToken,
                            userAccountAddress
                          )
                            .then((longSPLTokenVault) => {
                              findOrCreateAssociatedTokenAccount(
                                context,
                                optifiMarket.instrumentShortSplToken,
                                userAccountAddress
                              )
                                .then((shortSPLTokenVault) => {
                                  deriveVaultNonce(
                                    optifiMarket.serumMarket,
                                    serumId
                                  )
                                    .then(([vaultOwner, _]) => {
                                      getDexOpenOrders(
                                        context,
                                        optifiMarket.serumMarket,
                                        userAccountAddress
                                      )
                                        .then(([openOrdersAccount, _]) => {
                                          getSerumMarket(
                                            context,
                                            optifiMarket.serumMarket
                                          )
                                            .then((serumMarket) => {
                                              context.program.account.chain
                                                .fetch(optifiMarket.instrument)
                                                .then((chainRes) => {
                                                  // console.log("Chain res is ", chainRes);
                                                  // @ts-ignore
                                                  let chain = chainRes as Chain;
                                                  // console.log("Chain is", chain);
                                                  context.program.account.exchange
                                                    .fetch(exchangeAddress)
                                                    .then((exchangeRes) => {
                                                      let exchange =
                                                        exchangeRes as Exchange;
                                                      let result: CancelOrderContext =
                                                      {
                                                        optifiExchange:
                                                          exchangeAddress,
                                                        user: context.provider
                                                          .wallet.publicKey,
                                                        userAccount:
                                                          userAccountAddress,
                                                        userMarginAccount:
                                                          userAccount.userMarginAccountUsdc,
                                                        userInstrumentLongTokenVault:
                                                          longSPLTokenVault,
                                                        userInstrumentShortTokenVault:
                                                          shortSPLTokenVault,
                                                        optifiMarket:
                                                          marketAddress,
                                                        serumMarket:
                                                          optifiMarket.serumMarket,
                                                        openOrders:
                                                          openOrdersAccount,
                                                        requestQueue:
                                                          serumMarket.decoded
                                                            .requestQueue,
                                                        eventQueue:
                                                          serumMarket.decoded
                                                            .eventQueue,
                                                        bids: serumMarket.bidsAddress,
                                                        asks: serumMarket.asksAddress,
                                                        coinMint:
                                                          serumMarket.decoded
                                                            .baseMint,
                                                        coinVault:
                                                          serumMarket.decoded
                                                            .baseVault,
                                                        pcVault:
                                                          serumMarket.decoded
                                                            .quoteVault,
                                                        usdcCentralPool:
                                                          exchange.usdcCentralPool,
                                                        vaultSigner:
                                                          vaultOwner,
                                                        instrumentShortSplTokenMint:
                                                          optifiMarket.instrumentShortSplToken,
                                                        serumDexProgramId:
                                                          serumId,
                                                        tokenProgram:
                                                          TOKEN_PROGRAM_ID,
                                                        marginStressAccount: serumId,
                                                      };
                                                      resolve(result);
                                                    })
                                                    .catch((err) => {
                                                      console.error(err);
                                                      reject(err);
                                                    });
                                                })
                                                .catch((err) => {
                                                  console.error(err);
                                                  reject(err);
                                                });
                                            })
                                            .catch((err) => {
                                              console.error(
                                                "Got error trying to load serum market info from ",
                                                optifiMarket.serumMarket,
                                                err
                                              );
                                              reject(err);
                                            });
                                        })
                                        .catch((err) => reject(err));
                                    })
                                    .catch((err) => reject(err));
                                })
                                .catch((err) => reject(err));
                            })
                            .catch((err) => reject(err));
                        })
                        .catch((err) => {
                          console.error(
                            "Got error trying to load Optifi market info from ",
                            marketAddress,
                            err
                          );
                          reject(err);
                        });
                    } else {
                      console.error(
                        "Couldn't resolve user account at ",
                        userAccountAddress
                      );
                      reject(userAccountAddress);
                    }
                  })
                  .catch((err) => reject(err));
              })
              .catch((err) => reject(err));
          })
          .catch((err) => reject(err));
      })
      .catch((err) => reject(err));
  });
}

interface Order {
  orderId: BN;
  openOrdersAddress: PublicKey;
  openOrdersSlot: number;
  price: number;
  priceLots: BN;
  size: number;
  feeTier: number;
  sizeLots: BN;
  side: "buy" | "sell";
  clientId?: BN;
}

export function getOrdersOnMarket(
  context: Context,
  marketId: PublicKey
): Promise<Order[]> {
  return new Promise((resolve, reject) => {
    findUserAccount(context)
      .then(([userAccount, _]) => {
        context.program.account.optifiMarket
          .fetch(marketId)
          .then((marketRes) => {
            let optifiMarket = marketRes as OptifiMarket;
            getSerumMarket(context, optifiMarket.serumMarket).then(
              (serumMarket) => {
                serumMarket
                  .loadOrdersForOwner(context.connection, userAccount)
                  .then((orders) => {
                    resolve(orders);
                  });
              }
            );
          })
          .catch((err) => reject(err));
      })
      .catch((err) => reject(err));
  });
}
