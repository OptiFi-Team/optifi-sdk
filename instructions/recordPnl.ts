import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {PublicKey} from "@solana/web3.js";
import {findExchangeAccount, getDexOpenOrders} from "../utils/accounts";
import {OptifiMarket} from "../types/optifi-exchange-types";
import {deriveVaultNonce, getSerumMarket} from "../utils/market";
import {SERUM_DEX_PROGRAM_ID} from "../constants";


export default function recordPnl(context: Context,
                                  userToSettle: PublicKey,
                                  market: PublicKey,
                                  instrument: PublicKey): Promise<InstructionResult<string>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.optifiMarket.fetch(market).then((res) => {
                let optifiMarket = res as OptifiMarket;
                let serumMarketAddress = optifiMarket.serumMarket;
                deriveVaultNonce(serumMarketAddress, new PublicKey(SERUM_DEX_PROGRAM_ID))
                    .then(([vaultAddress, nonce]) => {

                        getSerumMarket(context, serumMarketAddress).then((serumMarket) => {
                            getDexOpenOrders(context, serumMarketAddress, userToSettle).then(([openOrdersAccount, _]) => {
                                let settlementTx = context.program.transaction.recordPnlForOneUser({
                                    optifiExchange: exchangeAddress,
                                    userAccount: userToSettle,
                                    optifiMarket: market,
                                    serumMarket: serumMarketAddress,
                                    userSerumOpenOrders: openOrdersAccount,
                                    instrument: instrument,
                                    bids: serumMarket.bidsAddress,
                                    asks: serumMarket.asksAddress,
                                    eventQueue: serumMarket.decoded.eventQueue,
                                    coinVault: serumMarket.decoded.baseVault,
                                    pcVault: serumMarket.decoded.quoteVault,
                                    vaultSigner: vaultAddress,
                                    userMarginAccount:
                                })
                            })
                        })
                })
            }).catch((err) => {
                console.error(err);
                reject(err);
            })
        })
    })
}