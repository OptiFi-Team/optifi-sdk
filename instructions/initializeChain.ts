import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {SystemProgram, SYSVAR_RENT_PUBKEY, TransactionSignature} from "@solana/web3.js";
import {findExchangeAccount, findInstrument} from "../utils/accounts";
import Asset from "../types/asset";
import InstrumentType from "../types/instrumentType";
import {STRIKE_LADDER_SIZE, SWITCHBOARD} from "../constants";
import expiryType from "../types/expiryType";
import {dateToAnchorTimestamp} from "../utils/generic";
import * as anchor from "@project-serum/anchor";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";

export function initializeChain(context: Context,
                                asset: Asset,
                                instrumentType: InstrumentType,
                                duration: number,
                                start: Date,
                                expiryType: expiryType,
                                expirationDate: Date
): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            let foundInstruments = [];
            let instrumentPromises: Promise<any>[] = [];
            for (let i = 0; i < STRIKE_LADDER_SIZE; i++) {
                instrumentPromises.push(findInstrument(
                        context,
                        asset,
                        instrumentType,
                        expirationDate,
                        expiryType,
                        i
                    )
                        .then(([instrumentAddress, bump]) => {
                            foundInstruments.push([instrumentAddress, bump])
                        })
                        .catch((err) => reject(err))
                )
            }
            Promise.all(instrumentPromises).then(() => {
                let accounts = {};
                let bumps = {};
                for (let i=0; i < STRIKE_LADDER_SIZE; i++) {
                   accounts[`instrument${i}`] = foundInstruments[i][0];
                   bumps[`instrument${i}`] = foundInstruments[i][1];
                }
                accounts['optifiExchange'] = exchangeAddress;
                accounts['payer'] = context.provider.wallet.publicKey;
                accounts['systemProgram'] = SystemProgram;
                accounts['rent'] = SYSVAR_RENT_PUBKEY;
                // TODO: switch this to all oracle accounts system
                accounts['assetSpotPriceOracleFeed'] = SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD;
                accounts['assetIvOracleFeed'] = SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_IV;
                let newInstrumentTx = context.program.transaction.createNewInstrument(
                    // @ts-ignore
                    bumps,
                    {
                        asset: new anchor.BN(asset as number),
                        instrumentType: new anchor.BN(instrumentType as number),
                        expiryDate: dateToAnchorTimestamp(expirationDate),
                        expiryType: new anchor.BN(expiryType as number),
                        duration: duration,
                        start: start,
                        authority: context.provider.wallet.publicKey,
                    },
                    accounts
                );
                signAndSendTransaction(context, newInstrumentTx)
                    .then((res) => {
                        console.log(res);
                        if (res.resultType === TransactionResultType.Successful) {
                            resolve({
                                successful: true,
                                data: res.txId as string,
                            });
                        } else {
                            console.error(res);
                            reject(res);
                        }
                    })
                    .catch((err) => reject(err))
            }).catch((err) => {
                console.error(err);
                reject(err);
            })
        })
    })
}