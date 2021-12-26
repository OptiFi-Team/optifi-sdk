import Context from "../types/context";
import {PublicKey, SystemProgram, Transaction, TransactionSignature} from "@solana/web3.js";
import {OPTIFI_EXCHANGE_ID, OPTIFI_MARKET_MINT_AUTH_PREFIX} from "../constants";
import {findAccountWithSeeds, findExchangeAccount} from "./accounts";
import InstructionResult from "../types/instructionResult";


export function findOptifiMarketMintAuthPDA(context: Context): Promise<[PublicKey, number]> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            findAccountWithSeeds(context, [
                Buffer.from(OPTIFI_MARKET_MINT_AUTH_PREFIX),
                exchangeAddress.toBuffer()
            ])
                .then((res) => resolve(res))
                .catch((err) => reject(err))
        })
    })
}
