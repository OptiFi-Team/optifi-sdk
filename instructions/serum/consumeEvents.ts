
import { PublicKey, TransactionSignature, Transaction } from "@solana/web3.js";
import { DexInstructions } from '@project-serum/serum';
import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { SERUM_DEX_PROGRAM_ID, USDC_TOKEN_MINT } from "../../constants";


// consume Serum Events queue
export async function consumeEvents(
    context: Context,
    serumMarket: PublicKey,
    openOrdersAccounts: PublicKey[],
    eventQueue: PublicKey,
    limit: number,
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise(async (resolve, reject) => {
        let serumDexProgramId = new PublicKey(SERUM_DEX_PROGRAM_ID[context.endpoint])

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

            let res = await context.provider.send(tx1);

            resolve({
                successful: true,
                data: res as TransactionSignature
            })
        } catch (err) {
            reject(err)
        }

    })
}