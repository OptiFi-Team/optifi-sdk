import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {SERUM_DEX_PROGRAM_ID} from "../constants";
import {findExchangeAccount} from "../utils/accounts";
import {PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY, Transaction, TransactionSignature} from "@solana/web3.js";
import {findOptifiMarkets, findOptifiMarketWithIdx, getSerumMarket} from "../utils/market";
import * as anchor from "@project-serum/anchor";
import {findOptifiMarketMintAuthPDA} from "../utils/pda";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";
import {MintLayout, Token, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";

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
                   context.connection.getMinimumBalanceForRentExemption(MintLayout.span).then((min) => {
                       let shortSplTokenMint = anchor.web3.Keypair.generate();
                       let createMintTx = new Transaction();
                       createMintTx.add(
                           SystemProgram.createAccount({
                               fromPubkey: context.provider.wallet.publicKey,
                               newAccountPubkey: shortSplTokenMint.publicKey,
                               lamports: min,
                               space: MintLayout.span,
                               programId: TOKEN_PROGRAM_ID
                           }),
                           Token.createInitMintInstruction(
                               TOKEN_PROGRAM_ID,
                               shortSplTokenMint.publicKey,
                               0,
                               mintAuthPDAAddress,
                               mintAuthPDAAddress
                           )
                       );
                       signAndSendTransaction(context, createMintTx, [shortSplTokenMint]).then((createMintRes) => {
                           if (createMintRes.resultType === TransactionResultType.Successful) {
                               console.debug("Created mint, ", formatExplorerAddress(context,
                                   createMintRes.txId as TransactionSignature,
                                   SolanaEntityType.Transaction));
                               let createMarketTx = context.program.transaction.createOptifiMarket(
                                   bump,
                                   {
                                       accounts: {
                                           optifiMarket: derivedMarketAddress,
                                           exchange: exchangeAddress,
                                           serumMarket: serumMarket,
                                           instrument: initialInstrument,
                                           longSplTokenMint: coinMintPk,
                                           shortSplTokenMint: shortSplTokenMint.publicKey,
                                           systemProgram: SystemProgram.programId,
                                           payer: context.provider.wallet.publicKey,
                                           clock: SYSVAR_CLOCK_PUBKEY
                                       },
                                   },
                               );
                               signAndSendTransaction(context, createMarketTx).then((txResult) => {
                                   if (txResult.resultType === TransactionResultType.Successful) {
                                       resolve({
                                           successful: true,
                                           data: txResult.txId as TransactionSignature,
                                       })
                                   } else {
                                       console.error(txResult);
                                       reject(txResult);
                                   }
                               })
                           } else {
                               reject(createMintRes);
                           }
                       })

                   })

               }).catch((err) => reject(err))
           })
       }).catch((err) => reject(err))
    })
}

export function createNextOptifiMarket(context: Context,
                                       serumMarketAddress: PublicKey,
                                       initialInstrument: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        getSerumMarket(context, serumMarketAddress).then((serumMarket) => {
            findOptifiMarkets(context).then((marketRes) => {
                let markets = marketRes.map((i) => i[0]);
                let marketLen = markets.length;
                createOptifiMarket(context,
                    serumMarketAddress,
                    initialInstrument,
                    serumMarket.baseMintAddress,
                    marketLen+1
                )
                    .then((res) => resolve(res))
                    .catch((err) => reject(err))
            })
        })
    })
}