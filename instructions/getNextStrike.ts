import Context from "../types/context";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, SystemProgram } from "@solana/web3.js";
import {
  findExchangeAccount,
  findParseOptimizedOracleAccountFromAsset,
  OracleAccountType,
} from "../utils/accounts";
import { InstrumentContext } from "../instructions/initializeChain";
import {
  assetToOptifiAsset,
  dateToAnchorTimestamp,
  expiryTypeToOptifiExpiryType,
  instrumentTypeToOptifiInstrumentType,
  optifiAssetToNumber,
  instrumentTypeToNumber,
  expiryTypeToNumber,
  optifiDurationToNumber,
} from "../utils/generic";
import * as anchor from "@project-serum/anchor";
export const instrumentIdx = 6; //if instrument address is already in use, plus 1

export function getNextStrike(
  context: Context,
  instrument: PublicKey,
  instrumentContext: InstrumentContext,
  bump: number
): Promise<number> {
  return new Promise((resolve, reject) => {
    findExchangeAccount(context)
      .then(async ([exchangeAddress, _]) => {
        let optifiAsset = assetToOptifiAsset(instrumentContext.asset);

        let data = {
          asset: optifiAssetToNumber(optifiAsset),
          instrumentType: instrumentTypeToNumber(
            instrumentTypeToOptifiInstrumentType(
              instrumentContext.instrumentType
            )
          ),
          expiryDate: dateToAnchorTimestamp(instrumentContext.expirationDate),
          duration: optifiDurationToNumber(instrumentContext.duration),
          start: dateToAnchorTimestamp(instrumentContext.start),
          expiryType: expiryTypeToNumber(
            expiryTypeToOptifiExpiryType(instrumentContext.expiryType)
          ),
          authority: context.provider.wallet.publicKey,
          contractSize: new anchor.BN(0.01 * 10000),
          instrumentIdx: instrumentIdx,
        };

        context.program.rpc.generateNextInstrument(
            bump, 
            data, 
            {
                accounts: {
                    optifiExchange: exchangeAddress,
                    instrument: instrument,
                    payer: context.provider.wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                    assetSpotPriceOracleFeed:
                    await findParseOptimizedOracleAccountFromAsset(
                        context,
                        optifiAsset,
                        OracleAccountType.Spot
                    ),
                    assetIvOracleFeed: await findParseOptimizedOracleAccountFromAsset(
                    context,
                    optifiAsset,
                    OracleAccountType.Iv
                    ),
                    clock: SYSVAR_CLOCK_PUBKEY,
                },
        });
      })
      .catch((err) => reject(err));
  });
}
