import Context from "../types/context";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, SystemProgram, TransactionSignature } from "@solana/web3.js";
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
import InstructionResult from "../types/instructionResult";
//TODO: use account.chain.account
export const instrumentIdx = 5; //if instrument address is already in use, plus 1

export function getNextStrike(
  context: Context,
  instrument: PublicKey,
  instrument2: PublicKey,
  instrumentContext: InstrumentContext,
  instrumentContext2: InstrumentContext,
  bump: number,
  bump2: number
): Promise<InstructionResult<TransactionSignature>> {
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

        let data2 = {
          asset: optifiAssetToNumber(optifiAsset),
          instrumentType: instrumentTypeToNumber(
            instrumentTypeToOptifiInstrumentType(
              instrumentContext2.instrumentType
            )
          ),
          expiryDate: dateToAnchorTimestamp(instrumentContext2.expirationDate),
          duration: optifiDurationToNumber(instrumentContext2.duration),
          start: dateToAnchorTimestamp(instrumentContext2.start),
          expiryType: expiryTypeToNumber(
            expiryTypeToOptifiExpiryType(instrumentContext2.expiryType)
          ),
          authority: context.provider.wallet.publicKey,
          contractSize: new anchor.BN(0.01 * 10000),
          instrumentIdx: instrumentIdx + 1,
        };

        let res = await context.program.rpc.generateNextInstrument(bump, bump2, data, data2, {
          accounts: {
            optifiExchange: exchangeAddress,
            instrument: instrument,
            instrument2: instrument2,
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

        resolve({
          successful: true,
          data: res as TransactionSignature
        })
      })
      .catch((err) => reject(err));
  });
}
