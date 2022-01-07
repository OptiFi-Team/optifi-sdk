import Context from "../types/context";
import {PublicKey, SYSVAR_RENT_PUBKEY} from "@solana/web3.js";
import {
    findExchangeAccount,
    findUserAccount,
    getDexOpenOrders,
    userAccountExists
} from "./accounts";
import {OptifiMarket, UserAccount} from "../types/optifi-exchange-types";
import {deriveVaultNonce, getSerumMarket} from "./market";
import {SERUM_DEX_PROGRAM_ID} from "../constants";
import {findOptifiMarketMintAuthPDA} from "./pda";
import {TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {findAssociatedTokenAccount} from "./token";

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
    instrumentShortSplTokenMint: PublicKey,
    serumDexProgramId: PublicKey,
    tokenProgram: PublicKey,
    rent: PublicKey
}

export function formOrderContext(context: Context,
                                 marketAddress: PublicKey): Promise<OrderAccountContext> {
    let serumId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint]);
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
                                        deriveVaultNonce(optifiMarket.serumMarket, serumId).then(([vaultOwner, _]) => {
                                            findOptifiMarketMintAuthPDA(context).then(([mintAuthAddress, _]) => {
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
                                                        coinVault: serumMarket.decoded.baseVault,
                                                        pcVault: serumMarket.decoded.quoteVault,
                                                        vaultSigner: vaultOwner,
                                                        orderPayerTokenAccount: longSPLTokenVault,
                                                        instrumentTokenMintAuthorityPda: mintAuthAddress,
                                                        instrumentShortSplTokenMint: optifiMarket.instrumentShortSplToken,
                                                        serumDexProgramId: serumId,
                                                        tokenProgram: TOKEN_PROGRAM_ID,
                                                        rent: SYSVAR_RENT_PUBKEY
                                                    })
                                                }).catch((err) => {
                                                    console.error("Got error trying to load serum market info from ",
                                                        optifiMarket.serumMarket, err);
                                                    reject(err);
                                                })
                                            }).catch((err) => reject(err));
                                        }).catch((err) => reject(err));
                                    }).catch((err) => reject(err));
                                }).catch((err) => reject(err));
                            }).catch((err) => {
                                console.error("Got error trying to load Optifi market info from ", marketAddress, err);
                                reject(err);
                            });
                        } else {
                            console.error("Couldn't resolve user account at ", userAccountAddress);
                            reject(userAccountAddress);
                        }
                    }).catch((err) => reject(err));
                }).catch((err) => reject(err));
            }).catch((err) => reject(err));
        }).catch((err) => reject(err));
    })
}