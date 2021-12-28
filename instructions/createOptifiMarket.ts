import Context from "../types/context";
import {OptifiMarket} from "../types/optifi-exchange-types";
import InstructionResult from "../types/instructionResult";
import {OPTIFI_EXCHANGE_ID, SERUM_DEX_PROGRAM_ID} from "../constants";
import {findExchangeAccount} from "../utils/accounts";
import {PublicKey, TransactionSignature} from "@solana/web3.js";
import {findOptifiMarkets, findOptifiMarketWithIdx} from "../utils/market";
import * as anchor from "@project-serum/anchor";
import {findOptifiMarketMintAuthPDA} from "../utils/pda";
import {signAndSendTransaction} from "../utils/transactions";

export function createOptifiMarket(context: Context,
                                   serumMarket: PublicKey,
                                   initialInstrument: PublicKey,
                                   coinMintPk: PublicKey,
                                   idx: number): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        // Find the relevant exchange account and derive the address that this market
        // will be at
       findExchangeAccount(context).then(([exchangeAddress, _]) => {
           findOptifiMarketWithIdx(
               context,
               exchangeAddress,
               idx
           ).then(([derivedMarketAddress, bump]) => {
               // Find the PDA authority
               findOptifiMarketMintAuthPDA(context).then(([mintAuthPDAAddress, _]) => {
                    let createMarketTx = context.program.transaction.createOptifiMarket(
                        bump,
                        {
                            optifiMarket: derivedMarketAddress,
                            exchange: exchangeAddress,
                            serumMarket: new PublicKey(SERUM_DEX_PROGRAM_ID),
                            instrument: initialInstrument,
                            longSPk
                        }
                    );

                    signAndSendTransaction(context, createMarketTx)
               }).catch((err) => reject(err))
           })
       }).catch((err) => reject(err))
    })
}

export function createNextOptifiMarket(context: Context,
                                       serumMarket: PublicKey,
                                       initialInstrument: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findOptifiMarkets(context).then((markets) => {
            let marketLen = markets.length;
            createOptifiMarket(context, serumMarket, initialInstrument, marketLen+1)
                .then((res) => resolve(res))
                .catch((err) => reject(err))
        })
    })
}