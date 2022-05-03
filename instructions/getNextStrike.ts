import Context from "../types/context";
import {
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SystemProgram,
} from "@solana/web3.js";
import {
  findExchangeAccount,
  findParseOptimizedOracleAccountFromAsset,
  OracleAccountType,
} from "../utils/accounts";
import { assetToOptifiAsset } from "../utils/generic";
import { InstrumentContext } from "../instructions/initializeChain";

export function getNextStrike(
  context: Context,
  newInstrument: PublicKey,
  instrumentContext: InstrumentContext
): Promise<number> {
  return new Promise((resolve, reject) => {
    findExchangeAccount(context)
      .then(async ([exchangeAddress, _]) => {
        let optifiAsset = assetToOptifiAsset(instrumentContext.asset);
        let updateTx = context.program.rpc.generateNextInstrument({
          accounts: {
            optifiExchange: exchangeAddress,
            instrument: newInstrument,
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
