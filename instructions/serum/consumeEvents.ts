
import { PublicKey, TransactionSignature, Transaction } from "@solana/web3.js";
import { DexInstructions } from '@project-serum/serum';
import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { SERUM_DEX_PROGRAM_ID } from "../../constants";
import { findExchangeAccount } from "../../utils/accounts";
import { findSerumAuthorityPDA } from "../../utils/pda";
import { increaseComputeUnitsIx } from "../../utils/transactions";


// consume Serum Events queue permissioned
export async function consumeEventsQPermissioned(
    context: Context,
    serumMarket: PublicKey,
    openOrdersAccounts: PublicKey[],
    eventQueue: PublicKey,
    limit: number,
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        let serumDexProgramId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.cluster])
        console.log(`passed ${openOrdersAccounts.length} openOrdersAccounts`)
        // let owner: Account = myWallet;
        // let marketAccont = await Market.load(connection, marketAddress, {}, serumDexProgramId);
        try {
            let [optifiExchange,] = await findExchangeAccount(context)
            let [consumeEventsAuthority,] = await findSerumAuthorityPDA(context)

            const tx1 = new Transaction();
            tx1.add(increaseComputeUnitsIx)
            openOrdersAccounts.forEach(async e => {
                tx1.add(
                    await context.program.methods.consumeEventQueue(20).accounts({
                        optifiExchange,
                        serumMarket,
                        eventQueue,
                        userSerumOpenOrders: e,
                        consumeEventsAuthority,
                        serumDexProgramId,
                    }).instruction()
                )
            })

            let res = await context.provider.sendAndConfirm(tx1);

            resolve({
                successful: true,
                data: res as TransactionSignature
            })
        } catch (err) {
            reject(err)
        }

    })
}

// consume Serum Events queue
export async function consumeEventsV2(
    context: Context,
    serumMarket: PublicKey,
    openOrdersAccounts: PublicKey[],
    eventQueue: PublicKey,
    limit: number,
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        let serumDexProgramId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.cluster])
        console.log(`passed ${openOrdersAccounts.length} openOrdersAccounts`)
        // let owner: Account = myWallet;
        // let marketAccont = await Market.load(connection, marketAddress, {}, serumDexProgramId);
        try {
            const tx1 = new Transaction();
            openOrdersAccounts.forEach(e => {
                tx1.add(DexInstructions.consumeEvents({
                    market: serumMarket,
                    openOrdersAccounts: [e],
                    eventQueue: eventQueue,
                    pcFee: eventQueue,
                    coinFee: eventQueue,
                    limit: 65535,
                    programId: serumDexProgramId,
                })
                )
            })

            let res = await context.provider.sendAndConfirm(tx1);

            resolve({
                successful: true,
                data: res as TransactionSignature
            })
        } catch (err) {
            reject(err)
        }

    })
}

// consume Serum Events queue
export async function consumeEvents(
    context: Context,
    serumMarket: PublicKey,
    openOrdersAccounts: PublicKey[],
    eventQueue: PublicKey,
    limit: number,
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        let serumDexProgramId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.cluster])

        // let owner: Account = myWallet;
        // let marketAccont = await Market.load(connection, marketAddress, {}, serumDexProgramId);
        try {
            const tx1 = new Transaction();
            let inx = DexInstructions.consumeEvents({
                market: serumMarket,
                openOrdersAccounts: openOrdersAccounts,
                eventQueue: eventQueue,
                pcFee: eventQueue,
                coinFee: eventQueue,
                limit: limit,
                programId: serumDexProgramId,
            });

            tx1.add(inx);

            let res = await context.provider.sendAndConfirm(tx1);

            resolve({
                successful: true,
                data: res as TransactionSignature
            })
        } catch (err) {
            reject(err)
        }

    })
}