import { initializeContext } from "../index";
import { getNextStrike, instrumentIdx } from "../instructions/getNextStrike";
import { InstrumentContext } from "../instructions/initializeChain";
import Asset from "../types/asset";
import instrumentType from "../types/instrumentType";
import { Duration } from "../types/optifi-exchange-types";
import ExpiryType from "../types/expiryType";
import { SUPPORTED_MATURITIES } from "../constants";
import { generateExpirations } from "../utils/chains";
import { findInstrument } from "../utils/accounts";
import {
  assetToOptifiAsset,
  expiryTypeToOptifiExpiryType,
  instrumentTypeToOptifiInstrumentType,
} from "../utils/generic";
import { PublicKey } from "@solana/web3.js";

initializeContext().then(async (context) => {
  let asset = Asset.Bitcoin
  let expirations = generateExpirations(0);
  let maturity = SUPPORTED_MATURITIES[0];
  let expirationDate = expirations[maturity];
  console.log("expirationDate: ", expirationDate)
  let instrumentContext: InstrumentContext = {
    asset: asset,
    instrumentType: instrumentType.Put,
    duration: Duration.Weekly,
    start: new Date(),
    expiryType: ExpiryType.Standard,
    expirationDate: expirationDate,
  };

  let instrumentContext2: InstrumentContext = {
    asset: asset,
    instrumentType: instrumentType.Call,
    duration: Duration.Weekly,
    start: new Date(),
    expiryType: ExpiryType.Standard,
    expirationDate: expirationDate,
  };
  let res = await findInstrument(
    context,
    assetToOptifiAsset(instrumentContext.asset),
    instrumentTypeToOptifiInstrumentType(instrumentContext.instrumentType),
    expiryTypeToOptifiExpiryType(instrumentContext.expiryType),
    instrumentIdx,
    instrumentContext.expirationDate
  );
  let instrument: PublicKey = res[0];
  let bump: number = res[1];

  let res2 = await findInstrument(
    context,
    assetToOptifiAsset(instrumentContext2.asset),
    instrumentTypeToOptifiInstrumentType(instrumentContext2.instrumentType),
    expiryTypeToOptifiExpiryType(instrumentContext2.expiryType),
    instrumentIdx + 1,
    instrumentContext2.expirationDate
  );
  let instrument2: PublicKey = res2[0];

  let bump2: number = res2[1];

  let result = await getNextStrike(context, instrument, instrument2, instrumentContext, instrumentContext2, bump, bump2);
  console.log(result)
});
