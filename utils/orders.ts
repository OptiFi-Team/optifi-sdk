import Context from "../types/context";
import {PublicKey} from "@solana/web3.js";
import {
    findAssociatedTokenAccount,
    findExchangeAccount,
    findUserAccount,
    getDexOpenOrders,
    userAccountExists
} from "./accounts";
import {OptifiMarket, UserAccount} from "../types/optifi-exchange-types";
import {getSerumMarket} from "./market";

export interface OrderAccountContext {
    exchange: PublicKey,
    user: PublicKey,
    userAccount: PublicKey,
    userMarginAccount: PublicKey,
    userInstrumentLongTokenVault: PublicKey,
    userInstrumentShortTokenVault: PublicKey,
    optifiMarket: PublicKey,
    serumMarket: PublicKey,
    openOrders: PublicKey,
    openOrdersOwner: PublicKey,
    requestQueue: PublicKey,
    eventQueue: PublicKey,
    bids: PublicKey,
    asks: PublicKey,
    coinMint: PublicKey,
    coinVault: PublicKey,
    pcVault: PublicKey,
    vaultSigner: PublicKey,
    orderPayerTokenAccount: PublicKey,
    instrumentTokenMintAuthorityPda: PublicKey,
    serumDexProgramId: PublicKey,
    tokenProgram: PublicKey,
    rent: PublicKey
}

export function formOrderContext(context: Context,
                                 marketAddress: PublicKey): Promise<OrderAccountContext> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findUserAccount(context).then(([userAccountAddress, _]) => {
                userAccountExists(context).then(([acctExists, userAccount]) => {
                    getDexOpenOrders(context, marketAddress, userAccountAddress).then(([openOrdersAccount, _]) => {
                        if (acctExists && userAccount !== undefined) {
                            context.program.account.market.fetch(marketAddress).then((marketRes) => {
                                let optifiMarket = marketRes as OptifiMarket;
                                findAssociatedTokenAccount(context, optifiMarket.instrumentLongSplToken).then(([longSPLTokenVault, _]) => {
                                    findAssociatedTokenAccount(context, optifiMarket.instrumentShortSplToken).then(([shortSPLTokenVault, _]) => {
                                        getSerumMarket(context, optifiMarket.serumMarket).then((serumMarket) => {
                                            resolve({
                                                exchange: exchangeAddress,
                                                user: context.provider.wallet.publicKey,
                                                userAccount: userAccountAddress,
                                                userMarginAccount: userAccount.userMarginAccountUsdc,
                                                userInstrumentLongTokenVault: longSPLTokenVault,
                                                userInstrumentShortTokenVault: shortSPLTokenVault,
                                                optifiMarket: marketAddress,
                                                serumMarket: optifiMarket.serumMarket,
                                                openOrders: openOrdersAccount,
                                                openOrdersOwner: context.provider.wallet.publicKey,
                                                requestQueue: serumMarket.decoded.requestQueue,
                                                eventQueue: serumMarket.decoded.eventQueue,
                                                bids: serumMarket.bidsAddress,
                                                asks: serumMarket.asksAddress,
                                                coinMint: serumMarket.baseMintAddress,
                                                coinVault:
                                            })
                                        })
                                    })
                                })
                            })
                        } else {
                            console.error("Couldn't resolve user account at ", userAccountAddress);
                            reject(userAccountAddress);
                        }
                    })
                })
            })
        })
    })
}