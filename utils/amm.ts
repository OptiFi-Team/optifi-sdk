import Context from "../types/context";
import {PublicKey} from "@solana/web3.js";
import {Amm} from "../types/optifi-exchange-types";
import {findAccountWithSeeds, findExchangeAccount} from "./accounts";
import {AMM_PREFIX} from "../constants";
import Position from "../types/position";

export function findAMMWithIdx(context: Context,
                               exchangeAddress: PublicKey,
                               idx: number): Promise<[PublicKey, number]> {
    return findAccountWithSeeds(context, [
        Buffer.from(AMM_PREFIX),
        exchangeAddress.toBuffer(),
        Uint8Array.of(idx)
    ])
}

function iterateFindAMM(context: Context,
                        exchangeAddress: PublicKey,
                        idx: number = 1
                        ): Promise<[Amm, PublicKey][]> {
    return new Promise((resolve, reject) => {
        let ammAccounts: [Amm, PublicKey][] = [];
        findAMMWithIdx(context,
            exchangeAddress,
            idx).then(([address, bump]) => {
                console.debug("Looking for amm at", address.toString());
                context.program.account.amm.fetch(address).then((res) => {
                    // @ts-ignore
                    ammAccounts.push([res as Amm, address]);
                    iterateFindAMM(context,
                        exchangeAddress,
                        idx+1).then((remainingRes) => {
                        ammAccounts.push(...remainingRes);
                        resolve(ammAccounts);
                    }).catch((err) => resolve(ammAccounts))
                }).catch((err) => {
                    console.error(err)
                    resolve(ammAccounts)
                })
        }).catch((err) => {
            console.error(err)
            resolve(ammAccounts);
        })
    })
}

export function findAMMAccounts(context: Context): Promise<[Amm, PublicKey][]> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            iterateFindAMM(context, exchangeAddress).then((accts) => {
                console.debug(`Found ${accts.length} AMM accounts`);
                resolve(accts);
            })
        })
    })
}

export function findInstrumentIndexFromAMM(context: Context,
                                           amm: Amm,
                                           instrumentAddress: PublicKey): [Position, number] {
    let ammPositions = amm.positions as Position[];
    for (let i = 0; i < ammPositions.length; i++) {
        let position = ammPositions[i];
        if (position.instruments.toString() === instrumentAddress.toString()) {
            return [position, i];
        }
     }
    throw new Error(`Couldn't find instrument address ${instrumentAddress.toString()} in positions ${amm.positions}`);
}