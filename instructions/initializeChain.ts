import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import {PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionSignature} from "@solana/web3.js";
import {findExchangeAccount, findInstrument} from "../utils/accounts";
import Asset from "../types/asset";
import InstrumentType from "../types/instrumentType";
import {STRIKE_LADDER_SIZE, SWITCHBOARD} from "../constants";
import expiryType from "../types/expiryType";
import {dateToAnchorTimestamp} from "../utils/generic";
import * as anchor from "@project-serum/anchor";
import {signAndSendTransaction, TransactionResultType} from "../utils/transactions";
import {formatExplorerAddress, SolanaEntityType} from "../utils/debug";
import ExpiryType from "../types/expiryType";

export interface InstrumentContext {
    asset: Asset,
    instrumentType: InstrumentType,
    duration: number,
    start: Date,
    expiryType: ExpiryType,
    expirationDate?: Date
}

export function initializeChain(context: Context,
                                instrumentContext: InstrumentContext): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            console.log("Found exchange account ", exchangeAddress);
            let foundInstruments: any = [];
            let instrumentPromises: Promise<any>[] = [];
            for (let i = 0; i < STRIKE_LADDER_SIZE; i++) {
                instrumentPromises.push(findInstrument(
                        context,
                        instrumentContext.asset,
                        instrumentContext.instrumentType,
                        instrumentContext.expiryType,
                        i,
                        instrumentContext.expirationDate
                    )
                        .then(([instrumentAddress, bump]) => {
                            foundInstruments.push([instrumentAddress, bump])
                        })
                        .catch((err) => {
                            console.error("Got error trying to derive instrument address");
                            reject(err);
                        })
                )
            }
            console.log("Instrument promises are", instrumentPromises);
            Promise.all(instrumentPromises).then(() => {
                let accounts: any = {};
                let bumps: any = {};
                for (let i=0; i < STRIKE_LADDER_SIZE; i++) {
                   accounts[`instrument${i}`] = foundInstruments[i][0];
                   bumps[`instrument${i}`] = foundInstruments[i][1];
                }
                accounts['optifiExchange'] = exchangeAddress;
                accounts['payer'] = context.provider.wallet.publicKey;
                accounts['systemProgram'] = SystemProgram.programId;
                accounts['rent'] = SYSVAR_RENT_PUBKEY;
                accounts['assetSpotPriceOracleFeed'] = new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD);
                accounts['assetIvOracleFeed'] = new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_IV);
                console.log("Accounts are ", accounts, "bumps are ", bumps);
                let newInstrumentTx = context.program.transaction.createNewInstrument(
                    // @ts-ignore
                    bumps,
                    {
                        asset: new anchor.BN(instrumentContext.asset as number),
                        instrumentType: new anchor.BN(instrumentContext.instrumentType as number),
                        expiryDate: dateToAnchorTimestamp(instrumentContext.expirationDate),
                        expiryType: new anchor.BN(instrumentContext.expiryType as number),
                        duration: new anchor.BN(instrumentContext.duration),
                        start: dateToAnchorTimestamp(instrumentContext.start),
                        authority: context.provider.wallet.publicKey,
                    },
                    {
                        accounts: accounts
                    }
                );
                signAndSendTransaction(context, newInstrumentTx)
                    .then((res) => {
                        console.log(res);
                        console.log("Created new instrument -",
                            formatExplorerAddress(
                                context,
                                res.txId as string,
                                SolanaEntityType.Transaction,
                            )
                        )
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
                    .catch((err) => {
                        console.error("Got error trying to sign and send chain instruction ", err);
                        reject(err);
                    })
            }).catch((err) => {
                console.error("Got error trying to execute instrument promises", err);
                reject(err);
            })
        })
    })
}