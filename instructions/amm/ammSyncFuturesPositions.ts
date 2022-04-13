import Context from "../../types/context";
import InstructionResult from "../../types/instructionResult";
import { Connection, PublicKey, TransactionSignature } from "@solana/web3.js";
import { findExchangeAccount, findOracleAccountFromAsset, getDexOpenOrders, OracleAccountType } from "../../utils/accounts";
import { AmmAccount, OptifiMarket } from "../../types/optifi-exchange-types";
import { MANGO_GROUP_ID, MANGO_PROGRAM_ID, MANGO_USDC_CONFIG, SERUM_DEX_PROGRAM_ID } from "../../constants";
import { findInstrumentIndexFromAMM } from "../../utils/amm";
import { findAssociatedTokenAccount } from "../../utils/token";
import { signAndSendTransaction, TransactionResultType } from "../../utils/transactions";
import { getAmmLiquidityAuthPDA, getMangoAccountPDA } from "../../utils/pda";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { MangoClient, MangoAccount, MangoAccountLayout } from "@blockworks-foundation/mango-client";
import { numberToOptifiAsset } from "../../utils/generic";
import {
    Asset as OptifiAsset,
} from '../../types/optifi-exchange-types';


/**
 * Retrieve information about a Mango Account
 */
async function getMangoAccount(
    connection: Connection,
    mangoAccountPk: PublicKey,
    dexProgramId: PublicKey,
): Promise<MangoAccount> {
    const acc = await connection.getAccountInfo(
        mangoAccountPk,
        'processed',
    );
    const mangoAccount = new MangoAccount(
        mangoAccountPk,
        MangoAccountLayout.decode(acc == null ? undefined : acc.data),
    );
    await mangoAccount.loadOpenOrders(connection, dexProgramId);
    return mangoAccount;
}

export default function ammSyncFuturesPositions(context: Context,
    ammAddress: PublicKey): Promise<InstructionResult<TransactionSignature>> {
    return new Promise((resolve, reject) => {
        findExchangeAccount(context).then(([exchangeAddress, _]) => {
            context.program.account.ammAccount.fetch(ammAddress).then(async (ammRes) => {
                try {
                    // @ts-ignore
                    let amm = ammRes as AmmAccount;
                    let [ammLiquidityAuth,] = await getAmmLiquidityAuthPDA(context);
                    // prepare the mango account for amm
                    let mangoProgramId = new PublicKey(MANGO_PROGRAM_ID[context.endpoint])
                    let mangoGroup = new PublicKey(MANGO_GROUP_ID[context.endpoint])
                    let [ammMangoAccountAddress,] = await getMangoAccountPDA(mangoProgramId, mangoGroup, ammLiquidityAuth, amm.ammIdx)
                    // console.log("ammMangoAccountAddress: ", ammMangoAccountAddress.toString())

                    // new MangoAccount(ammMangoAccountAddress,)
                    let mangoAccountInfo = await getMangoAccount(context.connection, ammMangoAccountAddress, mangoProgramId)
                    console.log("mangoAccountInfo: ", mangoAccountInfo)

                    let client = new MangoClient(context.connection, mangoProgramId);
                    let mangoGroupAccountInfo = await client.getMangoGroup(mangoGroup)
                    // console.log("mangoGroupAccountInfo: ", mangoGroupAccountInfo)
                    // console.log("mangoGroupAccountInfo.mangoCache: ", mangoGroupAccountInfo.mangoCache.toString())

                    const rootBanks = await mangoGroupAccountInfo.loadRootBanks(client.connection);
                    // console.log("rootBanks: ", rootBanks)
                    // rootBanks.forEach(e => console.log("e?.publicKey.toString(): ", e?.publicKey.toString()))
                    let mangoUSDCConfig = MANGO_USDC_CONFIG[context.endpoint]
                    let usdcRootKey = new PublicKey(mangoUSDCConfig["rootKey"])
                    let index = rootBanks.findIndex(e => e?.publicKey.equals(usdcRootKey))
                    // console.log("index: ", index)
                    const usdcRootBank = rootBanks[index];

                    if (usdcRootBank) {
                        const nodeBanks = await usdcRootBank.loadNodeBanks(client.connection);

                        const filteredNodeBanks = nodeBanks.filter((nodeBank) => !!nodeBank);
                        // expect(filteredNodeBanks.length).to.equal(1);
                        let vault = filteredNodeBanks[0]!.vault

                        // console.log(mangoGroupAccountInfo.tokens.forEach(e => console.log(e.mint.toString(), " ", e.rootBank.toString())))

                        let spotOracle =
                            findOracleAccountFromAsset(
                                context,
                                numberToOptifiAsset(
                                    amm.asset
                                )
                            );
                        let ivOracle =
                            findOracleAccountFromAsset(
                                context,
                                numberToOptifiAsset(
                                    amm.asset
                                ),
                                OracleAccountType.Iv
                            );
                        let usdcSpotOracle =
                            findOracleAccountFromAsset(
                                context,
                                OptifiAsset.USDC,
                                OracleAccountType.Spot
                            );


                        context.program.rpc.ammSyncFuturePositions(
                            {
                                accounts: {
                                    optifiExchange: exchangeAddress,
                                    amm: ammAddress,
                                    mangoProgram: mangoProgramId,
                                    mangoGroup: mangoGroup,
                                    mangoGroupSigner: mangoGroupAccountInfo.signerKey,
                                    mangoAccount: ammMangoAccountAddress,
                                    owner: ammLiquidityAuth,
                                    mangoCache: mangoGroupAccountInfo.mangoCache,
                                    rootBank: usdcRootBank.publicKey,
                                    nodeBank: filteredNodeBanks[0]!.publicKey,
                                    vault: vault,
                                    ownerTokenAccount: new PublicKey("DtgXSHvstkRUhhbwZhBpbhyFwmXMchsnyvePuAgHbWfe"), // TODO: amm.quoteTokenVault,
                                    payer: context.provider.wallet.publicKey,
                                    tokenProgram: TOKEN_PROGRAM_ID,
                                    perpMarket: new PublicKey("FHQtNjRHA9U5ahrH7mWky3gamouhesyQ5QvpeGKrTh2z"),
                                    eventQueue: new PublicKey("Bu17U2YdBM9gRrqQ1zD6MpngQBb71RRAAn8dbxoFDSkU"),
                                },
                                remainingAccounts: mangoAccountInfo.spotOpenOrders.map((pubkey) => ({
                                    isSigner: false,
                                    isWritable: false,
                                    pubkey,
                                }))

                            }

                        ).then((syncRes) => {
                            resolve({
                                successful: true,
                                data: syncRes as TransactionSignature
                            })
                        }).catch((err) => {
                            console.error(err);
                            reject(err);
                        })
                    } else {
                        reject(Error("failed to load mango usdcRootBank"));
                    }
                } catch (err) {
                    reject(err)
                }

            }).catch((err) => reject(err))
            // }).catch((err) => reject(err))
            // }).catch((err) => reject(err))
            // }).catch((err) => reject(err))
            // })
            // .catch((err) => reject(err))
        }).catch((err) => reject(err))
    })
}