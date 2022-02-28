import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {findExchangeAccount} from "../utils/accounts";
import {PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY, TransactionSignature} from "@solana/web3.js";
import {findOptifiMarkets, findOptifiMarketWithIdx} from "../utils/market";
import * as anchor from "@project-serum/anchor";
import {findOptifiMarketMintAuthPDA} from "../utils/pda";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";
import {createInitializeMintInstruction, MintLayout, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";
import {getSerumMarket} from "../utils/serum";

export function createOptifiMarket(context: Context,
                                   serumMarket: PublicKey,
                                   initialInstrument: PublicKey,
                                   coinMintPk: PublicKey,
                                   idx: number): Promise<InstructionResult<[TransactionSignature, number]>> {
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
                               instructions: [
                                   SystemProgram.createAccount({
                                       fromPubkey: context.provider.wallet.publicKey,
                                       newAccountPubkey: shortSplTokenMint.publicKey,
                                       lamports: min,
                                       space: MintLayout.span,
                                       programId: TOKEN_PROGRAM_ID
                                   }),
                                   createInitializeMintInstruction(
                                       shortSplTokenMint.publicKey,
                                       0,
                                       mintAuthPDAAddress,
                                       mintAuthPDAAddress,
                                       TOKEN_PROGRAM_ID
                                   )
                               ]
                           },
                       );
                       signAndSendTransaction(context, createMarketTx, [shortSplTokenMint]).then((txResult) => {
                           if (txResult.resultType === TransactionResultType.Successful) {
                               console.log(formatExplorerAddress(context, txResult.txId as string,
                                   SolanaEntityType.Transaction));
                               resolve({
                                   successful: true,
                                   data: [txResult.txId as TransactionSignature, idx],
                               })
                           } else {
                               console.error(txResult);
                               reject(txResult);
                           }
                       })
                   })

               }).catch((err) => reject(err))
           })
       }).catch((err) => reject(err))
    })
}

export function createOptifiMarketWithIdx(context: Context,
                                          serumMarketAddress: PublicKey,
                                          initialInstrument: PublicKey,
                                          idx: number): Promise<InstructionResult<[TransactionSignature, number]>> {
    console.log(`Creating Optifi market with serum market key ${serumMarketAddress.toString()}, instrument ${initialInstrument.toString()}, idx ${idx}`);
    return new Promise((resolve, reject) => {
        getSerumMarket(context, serumMarketAddress).then((serumMarket) => {
            createOptifiMarket(context,
                serumMarketAddress,
                initialInstrument,
                serumMarket.baseMintAddress,
                idx
            )
                .then((res) => resolve(res))
                .catch((err) => reject(err))
        })
    })
}

export function createNextOptifiMarket(context: Context,
                                       serumMarketAddress: PublicKey,
                                       initialInstrument: PublicKey): Promise<InstructionResult<[TransactionSignature, number]>> {
    return new Promise((resolve, reject) => {
        findOptifiMarkets(context).then((marketRes) => {
            let markets = marketRes.map((i) => i[0]);
            let marketLen = markets.length;
            let maxMarketIdx: number;
            if (marketLen === 0) {
                maxMarketIdx = 0;
            } else {
                maxMarketIdx = Math.max(...markets.map((i) => i.optifiMarketId));
            }
            console.log(`Found ${marketLen} markets, max IDX is ${maxMarketIdx}, creating ${maxMarketIdx+1}`)
            createOptifiMarketWithIdx(
                context,
                serumMarketAddress,
                initialInstrument,
                maxMarketIdx+1
            )
                .then((res) => resolve(res))
                .catch((err) => reject(err))
        })
    })
}