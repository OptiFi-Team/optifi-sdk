import { initializeContext } from "../index";
import Context from "../types/context";
import InstructionResult from "../types/instructionResult";
import { Chain, Exchange, OptifiMarket } from "../types/optifi-exchange-types";
import { initializeSerumMarket } from "../index";
import { findExchangeAccount } from "../utils/accounts";
import { PublicKey } from "@solana/web3.js";
import { createOptifiMarketWithIdx } from "../instructions/createOptifiMarket";
import { numberAssetToDecimal, readJsonFile, sleep } from "../utils/generic";
import { findOptifiMarkets, findOptifiMarketWithIdx } from "../utils/market";
import fs from "fs";
import path from "path";

export interface BootstrapResult {
  exchange: Exchange;
  markets: OptifiMarket[];
}

initializeContext()
  .then((context: Context) => {
    console.log("Initialized");
    listInstrumentOnMarket(context)
      .then((res) => {
        console.log(res);
        console.log("Bootstrapped");
      })
      .catch((err) => {
        console.error(err);
        console.error("Got error");
      });
  })
  .catch((err) => {
    console.error(err);
    console.error("Got error");
  });

async function createSerumMarkets(
  context: Context,
  initialInstrument: PublicKey
): Promise<PublicKey> {
  // Intentionally do this the slow way because creating the serum markets is a super expensive process -
  // if there's a problem, we want to know before we've committed all our capital
  try {
    let instrument_res = await context.program.account.chain.fetch(
      initialInstrument
    );
    let instrument = instrument_res as unknown as Chain;
    let decimal = numberAssetToDecimal(instrument.asset)!;
    let res = await initializeSerumMarket(context, decimal);
    if (res.successful) {
      return res.data as PublicKey;
    } else {
      console.error(res);
      throw new Error("Couldn't create markets");
    }
  } catch (e: unknown) {
    console.error(e);
    throw new Error(e as string | undefined);
  }
}

/**
 * @param context The program context
 */
export default function listInstrumentOnMarket(
  context: Context
): Promise<InstructionResult<BootstrapResult>> {
  console.log("Exchange ID is ", context.exchangeUUID);
  return new Promise(async (resolve, reject) => {
    // check new instruments pubkey
    let [exchangeAddress] = await findExchangeAccount(context);
    let res = await context.program.account.exchange.fetch(exchangeAddress);
    let optifiExchange = res as Exchange;

    // call:  optifiExchange.instrumentUnique[0][5].instrumentPubkeys[0]
    // put:  optifiExchange.instrumentUnique[0][5].instrumentPubkeys[1] ???
    let newInstrumentAddress =
      //@ts-ignore
      optifiExchange.instrumentUnique[0][5].instrumentPubkeys[0].toString();

    let materials = readMaterailsForExchange(exchangeAddress);

    materials.instruments.push({
      address: newInstrumentAddress,
      isInUse: false,
    });
    saveMaterailsForExchange(exchangeAddress, materials);

    // create new serum markets
    let serumMarketKey = await createSerumMarkets(
      context,
      new PublicKey(newInstrumentAddress)
    );
    materials.serumMarkets.push({
      address: serumMarketKey.toString(),
      isInUse: false,
    });
    materials.instruments.forEach((e) => {
      if (e.address == newInstrumentAddress) {
        e.isInUse = true;
      }
    });
    saveMaterailsForExchange(exchangeAddress, materials);

    console.log("Creating optifi markets");
    let existingMarkets = await findOptifiMarkets(context);

    existingMarkets.forEach((market, i) => {
      materials.optifiMarkets[i] = {
        marketId: market[0].optifiMarketId,
        address: market[1].toString(),
        instrument: market[0].instrument.toString(),
        serumMarket: market[0].serumMarket.toString(),
      };
      let serumMarketIdx = materials.serumMarkets.findIndex(
        (e) => e.address == market[0].serumMarket.toString()
      );
      if (serumMarketIdx >= 0) {
        materials.serumMarkets[serumMarketIdx].isInUse = true;
      }
    });

    saveMaterailsForExchange(exchangeAddress, materials);

    let existingMarketsLen = materials.optifiMarkets.length;
    console.log("existingMarketsLen: " + existingMarketsLen);
    for (let i = existingMarketsLen; i < 20 + 1; i++) {
      await createOptifiMarketWithIdx(
        context,
        new PublicKey(materials.serumMarkets[i].address),
        new PublicKey(materials.instruments[i].address),
        i + 1
      );
      materials.serumMarkets[i].isInUse = true;
      let [optifiMarketAddress] = await findOptifiMarketWithIdx(
        context,
        exchangeAddress,
        i + 1
      );
      materials.optifiMarkets[i] = {
        marketId: i + 1,
        address: optifiMarketAddress.toString(),
        instrument: materials.instruments[i].address,
        serumMarket: materials.serumMarkets[i].address,
      };
      saveMaterailsForExchange(exchangeAddress, materials);

      await sleep(5 * 1000);
    }
    console.log("Created optifi markets");
  });
}

interface ExchangeMaterialInstruments {
  address: string;
  isInUse: boolean;
}
interface ExchangeMaterialSerumMarkets {
  address: string;
  isInUse: boolean;
}

interface ExchangeMaterialMarginStress {
  address: string;
  asset: number;
}

interface ExchangeMaterialOptifiMarkets {
  address: string;
  marketId: number;
  instrument: string;
  serumMarket: string;
}

interface ExchangeMaterialAmms {
  address: string;
  asset: number;
  index: number;
}

interface ExchangeMaterial {
  network: string;
  programId: string;
  exchangeUUID: string;
  exchangeAddress: string;
  instruments: ExchangeMaterialInstruments[];
  serumMarkets: ExchangeMaterialSerumMarkets[];
  optifiMarkets: ExchangeMaterialOptifiMarkets[];
  marginStressAccounts: ExchangeMaterialMarginStress[];
  amms: ExchangeMaterialAmms[];
}

const logsDirPrefix = "logs";
function readMaterailsForExchange(
  exchangeAddress: PublicKey
): ExchangeMaterial {
  let filePath = path.resolve(
    "./sequences",
    logsDirPrefix,
    exchangeAddress.toString() + ".json"
  );
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function saveMaterailsForExchange(
  exchangeAddress: PublicKey,
  data: ExchangeMaterial
) {
  let filename = path.resolve(
    "./sequences",
    logsDirPrefix,
    exchangeAddress.toString() + ".json"
  );
  fs.writeFileSync(filename, JSON.stringify(data, null, 4));
}
