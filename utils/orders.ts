import Context from "../types/context";
import {
  Connection,
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
import { deriveVaultNonce, findOptifiMarkets, isUserInitializedOnMarket, OptifiMarketFullData } from "./market";
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
import { getAllOrdersForAccount } from "./orderHistory";
import { Market, Orderbook, OpenOrders } from "@project-serum/serum";

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
  usdcFeePool: PublicKey;
  instrumentShortSplTokenMint: PublicKey;
  serumDexProgramId: PublicKey;
  tokenProgram: PublicKey;
}

export interface PlaceOrderContext extends OrderAccountContext {
  instrumentTokenMintAuthorityPda: PublicKey;
  marginStressAccount: PublicKey
  rent: PublicKey;
  // clock: PublicKey; // no need in Optifi program now
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
                          findAssociatedTokenAccount(
                            context,
                            optifiMarket.instrumentLongSplToken,
                            userAccountAddress
                          )
                            .then(([longSPLTokenVault,]) => {
                              findAssociatedTokenAccount(
                                context,
                                optifiMarket.instrumentShortSplToken,
                                userAccountAddress
                              )
                                .then(([shortSPLTokenVault,]) => {
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
                                                    usdcFeePool:
                                                      exchange.usdcFeePool,
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
                          findAssociatedTokenAccount(
                            context,
                            optifiMarket.instrumentLongSplToken,
                            userAccountAddress
                          )
                            .then(([longSPLTokenVault,]) => {
                              findAssociatedTokenAccount(
                                context,
                                optifiMarket.instrumentShortSplToken,
                                userAccountAddress
                              )
                                .then(([shortSPLTokenVault,]) => {
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
                                                          usdcFeePool:
                                                            exchange.usdcFeePool,
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
                                                        usdcFeePool:
                                                          exchange.usdcFeePool,
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
  marketAddress?: string;
  instrumentType?: string;
  expiryDate?: number;
  originalSize?: number;
  status: string;
  fillPercentage?: number;
}



export function getOrdersOnMarket(
  context: Context,
  marketId: PublicKey,
  instruments: any,
): Promise<Order[]> {
  return new Promise(async (resolve, reject) => {
    findUserAccount(context)
      .then(([userAccount, _]) => {
        context.program.account.optifiMarket
          .fetch(marketId)
          .then(async (marketRes) => {
            let optifiMarket = marketRes as OptifiMarket;
            getSerumMarket(context, optifiMarket.serumMarket)
              .then((serumMarket) => {
                serumMarket
                  .loadOrdersForOwner(context.connection, userAccount)
                  .then((orders) => {
                    if (instruments.length > 0) {
                      const instrumentRes: any = instruments.find((instrument: any) => {
                        return (instrument[1].toString() === optifiMarket.instrument.toString())
                      })
                      const openOrders: Array<any> = orders.map((order: any) => {
                        if (orders.length > 0) {
                          return {
                            ...order,
                            originalSize: '',
                            marketAddress: marketId.toString(),
                            price: order.price,
                            clientId: order.clientId.toNumber(),
                            assets: instrumentRes.asset ? instrumentRes.asset : instrumentRes[0].asset,
                            instrumentType: instrumentRes.instrumentType ? instrumentRes.instrumentType.toLowerCase() : Object.keys(instrumentRes[0].instrumentType)[0],
                            strike: instrumentRes.strike ? instrumentRes.strike.toNumber() : instrumentRes[0].strike.toNumber(),
                            expiryDate: instrumentRes.expiryDate ? instrumentRes.expiryDate.toNumber : instrumentRes[0].expiryDate.toNumber(),
                            status: '',
                            fillPercentage: ''
                          }
                        }
                      })
                      resolve(openOrders);
                    }
                  });
              });
          })
          .catch((err) => reject(err));
      })
      .catch((err) => reject(err));
  });
}

// Deprecated
export function getAllOpenOrdersForUserV1(
  context: Context,
  instruments: any,
): Promise<Array<Order[]>> {
  return new Promise(async (resolve, reject) => {
    try {
      const [userAddress, _] = await findUserAccount(context)
      const orderHistory = await getAllOrdersForAccount(context, userAddress)
      let clientGuide = {}

      orderHistory.map((history) => {
        clientGuide[history.clientId] = history.maxBaseQuantity
      })

      let existingMarkets = await findOptifiMarkets(context)
      let orderInfoStuff = existingMarkets.map(async (mkt: any) => {
        const isUserInitialized = await isUserInitializedOnMarket(context, mkt[1])

        if (isUserInitialized === true) {
          const serumMarket = await getSerumMarket(context, mkt[0].serumMarket)
          const myOrder: any = await serumMarket.loadOrdersForOwner(context.connection, userAddress)

          if (myOrder.length > 0 && myOrder !== undefined) {
            const instrumentRes: any = instruments.find((instrument: any) => {
              return instrument[1].toString() === mkt[0].instrument.toString()
            })

            const openOrders: Array<any> = myOrder.map((order: any) => {
              if (myOrder.length > 0) {
                return {
                  ...order,
                  originalSize: clientGuide[order.clientId],
                  marketAddress: mkt[1].toString(),
                  price: order.price,
                  status: order.size < clientGuide[order.clientId] ? 'Partially Filled' : 'Open',
                  fillPercentage: 1 - (order.size / clientGuide[order.clientId]),
                  clientId: order.clientId.toNumber(),
                  assets: instrumentRes.asset ? instrumentRes.asset : instrumentRes[0].asset,
                  instrumentType: instrumentRes.instrumentType ? instrumentRes.instrumentType.toLowerCase() : Object.keys(instrumentRes[0].instrumentType)[0],
                  strike: instrumentRes.strike ? instrumentRes.strike.toNumber() : instrumentRes[0].strike.toNumber(),
                  expiryDate: instrumentRes.expiryDate ? instrumentRes.expiryDate.toNumber : instrumentRes[0].expiryDate.toNumber()
                }
              }
            })
            return openOrders
          }
        }
      })
      resolve((await Promise.all(orderInfoStuff)).filter(order => order !== undefined).flat())

    } catch (err) {
      console.log(err)
      reject(err)
    }
  })
}

export function getAllOpenOrdersForUser(
  context: Context,
  optifiMarkets: OptifiMarketFullData[]
): Promise<Array<Order>> {
  return new Promise(async (resolve, reject) => {
    try {
      const [userAddress, _] = await findUserAccount(context)
      const userAccountRaw = await context.program.account.userAccount.fetch(userAddress);
      const orderHistory = await getAllOrdersForAccount(context, userAddress)
      let clientGuide = {}

      orderHistory.map((history) => {
        clientGuide[history.clientId] = history.maxBaseQuantity
      })

      let res: Order[] = []
      for (let marketAddress of userAccountRaw.tradingMarkets) {
        let optifiMarket = optifiMarkets.find(e => e.marketAddress.toString() == marketAddress.toString())!
        const myOrder: any = await loadOrdersForOwner(context.connection, optifiMarket.serumMarket, optifiMarket.asks!, optifiMarket.bids!, userAddress)
        if (myOrder.length > 0 && myOrder !== undefined) {
          const openOrders: Array<Order> = myOrder.map((order: any) => {
            if (myOrder.length > 0) {
              return {
                ...order,
                originalSize: clientGuide[order.clientId],
                marketAddress: optifiMarket.marketAddress,
                price: order.price,
                status: order.size < clientGuide[order.clientId] ? 'Partially Filled' : 'Open',
                fillPercentage: clientGuide[order.clientId] ? 1 - (order.size / clientGuide[order.clientId]) : 0,
                clientId: order.clientId,
                assets: optifiMarket.asset,
                instrumentType: optifiMarket.instrumentType,
                strike: optifiMarket.strike,
                expiryDate: optifiMarket.expiryDate
              }
            }
          })
          res.push(...openOrders)
        }
      }
      resolve(res.filter(order => order !== undefined).flat())

    } catch (err) {
      console.log(err)
      reject(err)
    }
  })
}

// Customised seurm helper - to load orders for an optifi user account with less rpc reuquests
async function loadOrdersForOwner(connection: Connection, market: Market, asks: Orderbook, bids: Orderbook, ownerAddress: PublicKey, cacheDurationMs = 0) {
  const [openOrdersAccounts] = await Promise.all([
    market.findOpenOrdersAccountsForOwner(connection, ownerAddress, cacheDurationMs),
  ]);
  return filterForOpenOrders(bids, asks, openOrdersAccounts);
}
// Customised seurm helper
function filterForOpenOrders(bids: Orderbook, asks: Orderbook, openOrdersAccounts: OpenOrders[]) {
  return [...bids, ...asks].filter((order) => openOrdersAccounts.some((openOrders) => order.openOrdersAddress.equals(openOrders.address)));
}

// Customised seurm helper - to load orders for an optifi user account with less rpc reuquests
export async function loadOrdersForUserAccount(context: Context, serumMarketAddress: PublicKey, asks: Orderbook, bids: Orderbook, userAccountAddress: PublicKey) {
  // get user's open orders account on the given market
  let [openOrdersAccountAddr, _] = await getDexOpenOrders(
    context,
    serumMarketAddress,
    userAccountAddress
  )

  return filterForOpenOrders2(bids, asks, openOrdersAccountAddr);
}

// Customised seurm helper
function filterForOpenOrders2(bids: Orderbook, asks: Orderbook, openOrdersAccountAddress: PublicKey) {
  return [...bids, ...asks].filter((order) => order.openOrdersAddress.equals(openOrdersAccountAddress));
}