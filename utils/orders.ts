import Context from "../types/context";
import {
  Connection,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  findExchangeAccount,
  findUserAccount,
  getDexOpenOrders,
} from "./accounts";
import {
  Exchange,
  OptifiMarket,
  OrderSide,
  UserAccount,
} from "../types/optifi-exchange-types";
import { deriveVaultNonce, OptifiMarketFullData } from "./market";
import { MAKER_FEE, TAKER_FEE, SERUM_DEX_PROGRAM_ID, SERUM_MAKER_FEE, SERUM_TAKER_FEE } from "../constants";
import { findOptifiMarketMintAuthPDA, findOptifiUSDCPoolAuthPDA } from "./pda";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  findAssociatedTokenAccount,
  findOrCreateAssociatedTokenAccount,
} from "./token";
import { getSerumMarket } from "./serum";
import { BN } from "@project-serum/anchor";

import { Chain } from "../types/optifi-exchange-types";
import { findMarginStressWithAsset } from "./margin";
import { getAllOrdersForAccount, OrderInstruction } from "./orderHistory";
import { Market, Orderbook, OpenOrders } from "@project-serum/serum";
import OrderType from "../types/OrderType";
import { findUserFeeAccount } from "../instructions/user/initializeFeeAccount";

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
  centralUsdcPoolAuth: PublicKey;
  instrumentShortSplTokenMint: PublicKey;
  serumDexProgramId: PublicKey;
  tokenProgram: PublicKey;
  feeAccount: PublicKey;
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
  side: OrderSide,
  userAccount: UserAccount,
): Promise<OrderAccountContext> {
  let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.cluster]);
  return new Promise((resolve, reject) => {
    let acctExists = true;
    findExchangeAccount(context)
      .then(([exchangeAddress, _]) => {
        findUserAccount(context)
          .then(([userAccountAddress, _]) => {
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
                                      findOptifiUSDCPoolAuthPDA(context).then(([centralUSDCPoolAuth, _]) => {
                                        context.program.account.exchange
                                          .fetch(exchangeAddress)
                                          .then(async (exchangeRes) => {
                                            let exchange =
                                              exchangeRes as Exchange;
                                            let [feeAccount,] = await findUserFeeAccount(context, exchangeAddress, userAccountAddress);

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
                                              centralUsdcPoolAuth: centralUSDCPoolAuth,
                                              vaultSigner: vaultOwner,
                                              //    orderPayerTokenAccount: (side === OrderSide.Bid ? userAccount.userMarginAccountUsdc : longSPLTokenVault),
                                              //    instrumentTokenMintAuthorityPda: mintAuthAddress,
                                              instrumentShortSplTokenMint:
                                                optifiMarket.instrumentShortSplToken,
                                              serumDexProgramId: serumId,
                                              tokenProgram:
                                                TOKEN_PROGRAM_ID,
                                              //    rent: SYSVAR_RENT_PUBKEY
                                              feeAccount: feeAccount
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
                                    }).catch((err) => reject(err));
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
  });
}

export function formPlaceOrderContext(
  context: Context,
  marketAddress: PublicKey,
  userAccount: UserAccount,
): Promise<[PlaceOrderContext, number]> {
  let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.cluster]);
  let acctExists = true;
  return new Promise((resolve, reject) => {
    findExchangeAccount(context)
      .then(([exchangeAddress, _]) => {
        findUserAccount(context)
          .then(([userAccountAddress, _]) => {
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
                                              findOptifiUSDCPoolAuthPDA(context).then(([centralUSDCPoolAuth, _]) => {
                                                // console.log("Chain res is ", chainRes);
                                                // @ts-ignore
                                                let chain = chainRes as Chain;
                                                // console.log("Chain is", chain);
                                                context.program.account.exchange
                                                  .fetch(exchangeAddress)
                                                  .then((exchangeRes) => {
                                                    findMarginStressWithAsset(context, exchangeAddress, chain.asset).then(async ([marginStressAddress, _bump]) => {
                                                      let exchange =
                                                        exchangeRes as Exchange;

                                                      let [feeAccount,] = await findUserFeeAccount(context, exchangeAddress, userAccountAddress);

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
                                                        centralUsdcPoolAuth: centralUSDCPoolAuth,
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
                                                        feeAccount: feeAccount
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
                                        }).catch((err) => reject(err));
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
  });
}

export function formCancelOrderContext(
  context: Context,
  marketAddress: PublicKey,
  userAccount: UserAccount,
): Promise<[CancelOrderContext, number]> {
  let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.cluster]);
  let acctExists = true;
  return new Promise((resolve, reject) => {
    findExchangeAccount(context)
      .then(([exchangeAddress, _]) => {
        findUserAccount(context)
          .then(([userAccountAddress, _]) => {
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
                                          findOptifiUSDCPoolAuthPDA(context).then(async ([centralUSDCPoolAuth, _]) => {
                                            // console.log("Chain res is ", chainRes);
                                            // @ts-ignore
                                            let chain = chainRes as Chain;
                                            // console.log("Chain is", chain);

                                            let [feeAccount,] = await findUserFeeAccount(context, exchangeAddress, userAccountAddress);

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
                                                  centralUsdcPoolAuth: centralUSDCPoolAuth,
                                                  vaultSigner:
                                                    vaultOwner,
                                                  instrumentShortSplTokenMint:
                                                    optifiMarket.instrumentShortSplToken,
                                                  serumDexProgramId:
                                                    serumId,
                                                  tokenProgram:
                                                    TOKEN_PROGRAM_ID,
                                                  marginStressAccount: serumId,
                                                  feeAccount: feeAccount
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
                                          console.error(
                                            "Got error trying to load serum market info from ",
                                            optifiMarket.serumMarket,
                                            err
                                          );
                                          reject(err);
                                        });
                                    }).catch((err) => reject(err));
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
  });
}

export interface Order {
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
  strike?: number;
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


// load all orders accounts for owner with only mutiple requests, should try loadOrdersAccountsForOwnerV2 first
export async function loadOrdersAccountsForOwner(connection: Connection, optifiMarkets: OptifiMarketFullData[], ownerAddress: PublicKey, cacheDurationMs = 0) {
  const openOrdersAccounts = await Promise.all(
    optifiMarkets.map(market => market.serumMarket.findOpenOrdersAccountsForOwner(connection, ownerAddress, cacheDurationMs)),
  );

  let res: { optifiMarketAddress: PublicKey, openOrdersAccount: OpenOrders }[] = []
  openOrdersAccounts.forEach(openOrdersAccountsOnOneMarket => {
    if (openOrdersAccountsOnOneMarket.length > 0) {
      let optifiMarket = optifiMarkets.find(optifiMarket => optifiMarket.serumMarket.address.toString() == openOrdersAccountsOnOneMarket[0].market.toString())!
      res.push({
        optifiMarketAddress: optifiMarket.marketAddress,
        openOrdersAccount: openOrdersAccountsOnOneMarket[0]
      })
    }
  })
  return res;
}

// load all orders accounts for owner with only one request
export async function loadOrdersAccountsForOwnerV2(context: Context, optifiMarkets: OptifiMarketFullData[], ownerAddress: PublicKey) {
  let serumProgramId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.cluster]);
  let userOpenOrdersAccountsAddresses: PublicKey[] = []
  for (let optifiMarket of optifiMarkets) {
    let [openOrdersAccountAddr, _] = await getDexOpenOrders(
      context,
      optifiMarket.serumMarket.address,
      ownerAddress
    )
    userOpenOrdersAccountsAddresses.push(openOrdersAccountAddr)
  }

  let openOrdersAccountsInfo = await context.connection.getMultipleAccountsInfo(userOpenOrdersAccountsAddresses)
  let res: { optifiMarketAddress: PublicKey, openOrdersAccount: OpenOrders }[] = []

  openOrdersAccountsInfo.forEach((e, i) => {
    if (e) {
      let openOrdersAccount = OpenOrders.fromAccountInfo(userOpenOrdersAccountsAddresses[i], e, serumProgramId)
      res.push({
        optifiMarketAddress: optifiMarkets[i].marketAddress,
        openOrdersAccount: openOrdersAccount
      })
    }
  })

  return res;
}

// Customised seurm helper - to load orders for an optifi user account on all optifi markets
// orderHistory is optional. if orderHistory is not avaliable, order's originalSize/status/fillPercentage will be undefined
export async function loadOrdersForOwnerOnAllMarkets(optifiMarkets: OptifiMarketFullData[], openOrdersAccounts: OpenOrders[], orderHistory?: OrderInstruction[]) {
  let res: Order[] = []
  for (let i = 0; i < openOrdersAccounts.length; i++) {
    let openOrdersAccount = openOrdersAccounts[i]
    let optifiMarket = optifiMarkets.find(market => market.serumMarket.address.toString() == openOrdersAccount.market.toString())!
    let myOrder = await loadOrdersForOwnerOnOneMarket(optifiMarket.asks!, optifiMarket.bids!, openOrdersAccount)
    let originalSize: any = {}
    if (orderHistory) {
      orderHistory.forEach((order) => {
        originalSize[order.clientId] = order.maxBaseQuantity
      })
    }
    if (myOrder.length > 0 && myOrder !== undefined) {
      const openOrders: Array<Order> = myOrder.map((order: any) => {
        if (myOrder.length > 0) {
          return {
            ...order,
            originalSize: originalSize[order.clientId] || undefined,
            marketAddress: optifiMarket.marketAddress,
            price: order.price,
            status: originalSize[order.clientId] ? order.size < originalSize[order.clientId] ? 'Partially Filled' : 'Open' : undefined,
            fillPercentage: originalSize[order.clientId] ? originalSize[order.clientId] ? 1 - (order.size / originalSize[order.clientId]) : 0 : undefined,
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
  return res;
}

// Customised seurm helper - to load orders for an optifi on one optifi market
export async function loadOrdersForOwnerOnOneMarket(asks: Orderbook, bids: Orderbook, openOrdersAccounts: OpenOrders) {
  return filterForOpenOrders(bids, asks, [openOrdersAccounts]);
}

export interface UnsettledFund {
  optifiMarketAddress: PublicKey,
  baseTokenAmount: number,
  quoteTokenAmount: number,
}

export async function loadUnsettledFundForOwnerOnAllMarkets(optifiMarkets: OptifiMarketFullData[], openOrdersAccounts: OpenOrders[]) {
  let res: UnsettledFund[] = []
  openOrdersAccounts.forEach(e => {
    let optifiMarket = optifiMarkets.find(market => market.serumMarket.address.toString() == e.market.toString())
    if (optifiMarket && (e.baseTokenFree.toNumber() > 0 || e.quoteTokenFree.toNumber() > 0)) {
      res.push({
        optifiMarketAddress: optifiMarket.marketAddress,
        baseTokenAmount: optifiMarket.serumMarket.baseSplSizeToNumber(e.baseTokenFree),
        quoteTokenAmount: optifiMarket.serumMarket.quoteSplSizeToNumber(e.quoteTokenFree)
      })
    }
  })
  return res
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


// Fee Calculator
function getTotalFee(context: Context, orderType: OrderType, is_registered_maker: Boolean): number {
  switch (orderType) {
    case OrderType.PostOnly: {
      return MAKER_FEE[context.cluster];
    }
    default: {
      return TAKER_FEE[context.cluster];
    }
  }
}
function getSerumFee(context: Context, orderType: OrderType, is_registered_maker: Boolean): number {
  switch (orderType) {
    case OrderType.PostOnly: {
      return SERUM_MAKER_FEE[context.cluster];
    }
    default: {
      return SERUM_TAKER_FEE[context.cluster];
    }
  }
}
export function calculatePcQtyAndFee(context: Context, maxPcQty: number, orderSide: OrderSide, orderType: OrderType, is_registered_maker: Boolean): [number, number, number] | undefined {

  let totalFee = maxPcQty * getTotalFee(context, orderType, is_registered_maker);
  let serumFee = maxPcQty * getSerumFee(context, orderType, is_registered_maker);

  switch (orderSide) {
    case OrderSide.Ask:
      return [maxPcQty - totalFee, maxPcQty - serumFee, totalFee];
    case OrderSide.Bid:
      return [maxPcQty + totalFee, maxPcQty + serumFee, totalFee];
  }
}