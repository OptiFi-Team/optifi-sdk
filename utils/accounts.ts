import Context from "../types/context";
import { AccountInfo, GetProgramAccountsFilter, PublicKey } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import {
  EXCHANGE_PREFIX,
  INSTRUMENT_PREFIX,
  LIQUIDATION_STATE_PREFIX,
  MARKET_MAKER_PREFIX,
  PYTH,
  SERUM_OPEN_ORDERS_PREFIX,
  SWITCHBOARD,
  OPUSDC_TOKEN_MINT,
  USER_ACCOUNT_PREFIX,
  USER_TOKEN_ACCOUNT_PDA,
  OPTIFI_USDC_AUTHORITY_PREFIX,
  OPTIFI_USDC_PROGRAM_ID,
  OPTIFI_USDC_MINT_PREFIX,
  USDC_TOKEN_MINT,
  OPTIFI_MARKET_PREFIX
} from "../constants";
import { Chain, Exchange, FeeAccount, UserAccount } from "../types/optifi-exchange-types";
import { Asset as OptifiAsset } from "../types/optifi-exchange-types";
import { InstrumentType as OptifiInstrumentType } from "../types/optifi-exchange-types";
import { ExpiryType as OptifiExpiryType } from "../types/optifi-exchange-types";
import { dateToAnchorTimestamp, expiryTypeToNumber, instrumentTypeToNumber, numberToOptifiAsset, optifiAssetToNumber } from "./generic";
import { findAssociatedTokenAccount } from "./token";
import { initializeUserAccount } from "../index";
import base58 from "bs58";
import { parseAggregatorAccountData } from "@switchboard-xyz/switchboard-api";
import Asset from "../types/asset";
/**
 * Helper function for finding an account with a list of seeds
 *
 * @param context Program context
 * @param seeds The seeds to look for the account with
 */
export function findAccountWithSeeds(context: Context, seeds: (Buffer | Uint8Array)[]): Promise<[PublicKey, number]> {
  return anchor.web3.PublicKey.findProgramAddress(seeds, context.program.programId);
}

/**
 * Helper function for finding optifi USDC authority address
 *
 * @param context Program context
 */
export function findOpUsdcAuth(context: Context): Promise<[PublicKey, number]> {
  return anchor.web3.PublicKey.findProgramAddress([Buffer.from(OPTIFI_USDC_AUTHORITY_PREFIX)], new PublicKey(OPTIFI_USDC_PROGRAM_ID[context.cluster]));
}

/**
 * Helper function for finding optifi USDC mint address
 *
 * @param context Program context
 */
export function findOptifiUsdcMint(context: Context): Promise<[PublicKey, number]> {
  return anchor.web3.PublicKey.findProgramAddress([Buffer.from(OPTIFI_USDC_MINT_PREFIX)], new PublicKey(OPTIFI_USDC_PROGRAM_ID[context.cluster]));
}

/**
 * Find the Solana program address for the user in context with the expected seeds
 *
 * @param context The program context
 */
export function findUserAccount(context: Context, owner?: PublicKey): Promise<[PublicKey, number]> {
  return new Promise((resolve, reject) => {
    findExchangeAccount(context).then(([exchangeId, _]) => {
      findAccountWithSeeds(context, [
        Buffer.from(USER_ACCOUNT_PREFIX),
        exchangeId.toBuffer(),
        owner?.toBuffer() || context.provider.wallet.publicKey.toBuffer(),
      ])
        .then((res) => resolve(res))
        .catch((err) => reject(err));
    });
  });
}

export function findExchangeAccount(context: Context): Promise<[PublicKey, number]> {
  return findAccountWithSeeds(context, [Buffer.from(EXCHANGE_PREFIX), Buffer.from(context.exchangeUUID)]);
}

export function findOptifiExchange(context: Context): Promise<[PublicKey, number]> {
  return findExchangeAccount(context);
}

export function getDexOpenOrders(context: Context, marketAddress: PublicKey, userAccountAddress: PublicKey): Promise<[PublicKey, number]> {
  return new Promise((resolve, reject) => {
    findExchangeAccount(context)
      .then(([exchangeAddress, _]) => {
        findAccountWithSeeds(context, [
          Buffer.from(SERUM_OPEN_ORDERS_PREFIX),
          exchangeAddress.toBuffer(),
          marketAddress.toBuffer(),
          userAccountAddress.toBuffer(),
        ])
          .then((res) => resolve(res))
          .catch((err) => reject(err));
      })
      .catch((err) => reject(err));
  });
}

export function findUserUSDCAddress(context: Context): Promise<[PublicKey, number]> {
  return findAssociatedTokenAccount(context, new PublicKey(USDC_TOKEN_MINT[context.cluster]));
}

export function findUserOPUSDCAddress(context: Context): Promise<[PublicKey, number]> {
  return findAssociatedTokenAccount(context, new PublicKey(OPUSDC_TOKEN_MINT[context.cluster]));
}

/**
 * Helper function to determine whether or not an optifi user account exists associated
 * with the current user
 *
 * @param context The program context
 */
export function userAccountExists(context: Context): Promise<[boolean, UserAccount?]> {
  return new Promise((resolve) => {
    findUserAccount(context).then((userAccount) => {
      context.program.account.userAccount
        .fetch(userAccount[0])
        .then((res) => {
          if (res) {
            console.log("Account already exists", res);
            // @ts-ignore
            resolve([true, res as UserAccount]);
          } else {
            resolve([false, undefined]);
          }
        })
        .catch((err) => {
          resolve([false, undefined]);
        });
    });
  });
}

export function exchangeAccountExists(context: Context): Promise<[boolean, Exchange?]> {
  return new Promise((resolve) => {
    findExchangeAccount(context).then(([exchangeAddress, _]) => {
      console.log("Exchange address is ", exchangeAddress.toString());
      context.program.account.exchange
        .fetch(exchangeAddress)
        .then((res) => {
          if (res) {
            console.log("Exchange data is ", res);
            resolve([true, res as Exchange]);
          } else {
            resolve([false, undefined]);
          }
        })
        .catch(() => {
          resolve([false, undefined]);
        });
    });
  });
}

/**
 * Find the PDA, who is the account which controls all user's usdc vaults
 *
 * @param context The program context
 */
export function findPDA(context: Context): Promise<[PublicKey, number]> {
  return new Promise((resolve, reject) => {
    findOptifiExchange(context).then(([address, bump]) => {
      anchor.web3.PublicKey.findProgramAddress([Buffer.from(USER_TOKEN_ACCOUNT_PDA), address.toBuffer()], context.program.programId)
        .then((res) => resolve(res))
        .catch((err) => reject(err));
    });
  });
}

export function findInstrument(
  context: Context,
  asset: OptifiAsset,
  instrumentType: OptifiInstrumentType,
  expiryType: OptifiExpiryType,
  idx: number,
  expiryDate?: Date
): Promise<[PublicKey, number, string]> {
  return new Promise((resolve, reject) => {
    let expiryDateStr: string = dateToAnchorTimestamp(expiryDate).toNumber().toString();
    let seedStr: string =
      optifiAssetToNumber(asset).toString() +
      instrumentTypeToNumber(instrumentType).toString() +
      expiryTypeToNumber(expiryType).toString() +
      expiryDateStr +
      idx.toString();
    findExchangeAccount(context).then(([exchangeAddress, _]) => {
      console.log(
        "Asset is ",
        optifiAssetToNumber(asset),
        " instrument type is ",
        instrumentTypeToNumber(instrumentType),
        " expiry type is ",
        expiryTypeToNumber(expiryType),
        "idx is ",
        idx,
        "expiry date is ",
        expiryDateStr,
        "exchange addr is ",
        exchangeAddress.toString(),
        " seed string is ",
        seedStr
      );
      findAccountWithSeeds(context, [Buffer.from(INSTRUMENT_PREFIX), exchangeAddress.toBuffer(), Buffer.from(seedStr)])
        .then((res) => {
          console.log("Address for signed seed ", seedStr, " is , ", res[0].toString(), res[1]);
          resolve([...res, seedStr]);
        })
        .catch((err) => reject(err));
    });
  });
}

export function findPerpsInstrument(
  context: Context,
  asset: Asset,
  exchangeAddress: PublicKey
): Promise<[PublicKey, number, string]> {
  return new Promise((resolve, reject) => {
    let seedStr: string = "perp"
    findAccountWithSeeds(context, [Buffer.from(INSTRUMENT_PREFIX), exchangeAddress.toBuffer(), Buffer.from(seedStr), Uint8Array.of(asset)])
      .then((res) => {
        console.log("Address for signed seed ", seedStr, " is , ", res[0].toString(), res[1]);
        resolve([...res, seedStr]);
      })
      .catch((err) => reject(err));

  });
}

export function findPerpAccount(
  context: Context,
  asset: Asset,
  exchangeAddress: PublicKey
): Promise<[PublicKey, number]> {
  return new Promise((resolve, reject) => {
    let seedStr1: string =
      "perp" + asset.toString()
    let seedStr2: string = asset.toString()
    findAccountWithSeeds(context, [Buffer.from(seedStr1), exchangeAddress.toBuffer(), Buffer.from(seedStr2)])
      .then((res) => {
        resolve([...res]);
      })
      .catch((err) => reject(err));

  });
}

export function findPerpsMarket(
  context: Context,
  asset: Asset,
  exchangeAddress: PublicKey
): Promise<[PublicKey, number]> {
  return new Promise((resolve, reject) => {
    let seedStr: string =
      "perp" + asset.toString()
    findAccountWithSeeds(context, [Buffer.from(OPTIFI_MARKET_PREFIX), exchangeAddress.toBuffer(), Buffer.from(seedStr)])
      .then((res) => {
        resolve([...res]);
      })
      .catch((err) => reject(err));

  });
}

export enum OracleAccountType {
  Spot,
  Iv,
}

export async function findOracleAccountFromAsset(
  context: Context,
  asset: OptifiAsset,
  oracleAccountType: OracleAccountType = OracleAccountType.Spot
): Promise<PublicKey> {
  switch (asset) {
    case OptifiAsset.Bitcoin:
      if (oracleAccountType === OracleAccountType.Spot) {
        return new PublicKey(PYTH[context.cluster].BTC_USD);
      } else {
        return new PublicKey(SWITCHBOARD[context.cluster].SWITCHBOARD_BTC_IV);
      }
    case OptifiAsset.Ethereum:
      if (oracleAccountType === OracleAccountType.Spot) {
        return new PublicKey(PYTH[context.cluster].ETH_USD);
      } else {
        return new PublicKey(SWITCHBOARD[context.cluster].SWITCHBOARD_ETH_IV);
      }
    case OptifiAsset.USDC:
      if (oracleAccountType === OracleAccountType.Iv) {
        console.warn("No IV account for USDC, returning spot");
      }
      return new PublicKey(PYTH[context.cluster].USDC_USD);
    case OptifiAsset.Solana:
      if (oracleAccountType === OracleAccountType.Spot) {
        return new PublicKey(PYTH[context.cluster].SOL_USD);
      } else {
        return new PublicKey(SWITCHBOARD[context.cluster].SWITCHBOARD_SOL_IV);
      }
    default:
      console.log("Asset is ", asset);
      throw new Error(`Unsupported asset ${asset}`);
  }
}

export function findOracleAccountFromInstrument(
  context: Context,
  instrumentAddress: PublicKey,
  oracleAccountType: OracleAccountType = OracleAccountType.Spot
): Promise<PublicKey> {
  return new Promise((resolve, reject) => {
    context.program.account.chain.fetch(instrumentAddress).then(async (chainRes) => {
      // @ts-ignore
      let chain = chainRes as Chain;
      try {
        resolve(await findOracleAccountFromAsset(context, numberToOptifiAsset(chain.asset), oracleAccountType));
      } catch (e) {
        console.error(e);
        reject(e);
      }
    });
  });
}

export function findMarketMakerAccount(context: Context): Promise<[PublicKey, number]> {
  return new Promise((resolve, reject) => {
    findExchangeAccount(context).then(([exchangeAddress, _]) => {
      findUserAccount(context).then(([userAccountAddress, _]) => {
        findAccountWithSeeds(context, [Buffer.from(MARKET_MAKER_PREFIX), exchangeAddress.toBuffer(), userAccountAddress.toBuffer()])
          .then((res) => resolve(res))
          .catch((err) => reject(err));
      });
    });
  });
}

export function findLiquidationState(context: Context, userAccount: PublicKey): Promise<[PublicKey, number]> {
  return new Promise((resolve, reject) => {
    findExchangeAccount(context).then(([exchangeAddress, _]) => {
      findAccountWithSeeds(context, [Buffer.from(LIQUIDATION_STATE_PREFIX), exchangeAddress.toBuffer(), userAccount.toBuffer()])
        .then((res) => resolve(res))
        .catch((err) => reject(err));
    });
  });
}

/**
 * Helper function to either fetch the user's account on this exchange, or create it if it doesn't already exist
 *
 */
export function createUserAccountIfNotExist(context: Context): Promise<void> {
  return new Promise((resolve, reject) => {
    userAccountExists(context)
      .then(([exists, _]) => {
        if (exists) {
          console.debug("User account already exists");
          resolve();
        } else {
          console.debug("User account does not already exist, creating...");
          initializeUserAccount(context)
            .then((res) => {
              console.log(res);
              resolve();
            })
            .catch((err) => reject(err));
        }
      })
      .catch((err) => reject(err));
  });
}

export async function getFilteredProgramAccounts(
  context: Context,
  programId: PublicKey,
  filters
): Promise<{ publicKey: PublicKey; accountInfo: AccountInfo<Buffer> }[]> {
  // @ts-ignore
  const resp = await context.connection._rpcRequest("getProgramAccounts", [
    programId.toBase58(),
    {
      commitment: context.connection.commitment,
      filters,
      encoding: "base64",
    },
  ]);
  if (resp.error) {
    throw new Error(resp.error.message);
  }
  return resp.result.map(({ pubkey, account: { data, executable, owner, lamports } }) => ({
    publicKey: new PublicKey(pubkey),
    accountInfo: {
      data: Buffer.from(data[0], "base64"),
      executable,
      owner: new PublicKey(owner),
      lamports,
    },
  }));
}

export async function getAllUsersOnExchange(context: Context): Promise<{ publicKey: PublicKey; accountInfo: UserAccount }[]> {
  let [exchangeAddress, _] = await findExchangeAccount(context);
  const filters: GetProgramAccountsFilter[] = [
    {
      memcmp: {
        offset: 8,
        bytes: exchangeAddress.toBase58(),
      },
    },
  ];
  let allUsers = await context.program.account.userAccount.all(filters);

  // @ts-ignore
  return allUsers.map((e) => {
    return {
      publicKey: e.publicKey,
      // @ts-ignore
      accountInfo: e.account as UserAccount,
    };
  });
}

// get user account by account id
export async function getUserAccountById(context: Context, id: number): Promise<{ publicKey: PublicKey; accountInfo: UserAccount }> {
  let [exchangeAddress, _] = await findExchangeAccount(context);
  const filters: GetProgramAccountsFilter[] = [
    {
      memcmp: {
        offset: 8,
        bytes: exchangeAddress.toBase58(),
      },
    },
    {
      memcmp: {
        offset: 72,
        bytes: base58.encode(new anchor.BN(id).toArrayLike(Buffer, "le", 8)),
      },
    },
  ];
  let res = await context.program.account.userAccount.all(filters);

  // @ts-ignore
  return {
    publicKey: res[0].publicKey,
    // @ts-ignore
    accountInfo: res[0].account as UserAccount,
  };
}

// get user account by account id
export async function getRefereeFeeAccounts(context: Context, userWalletAddress: PublicKey): Promise<{ publicKey: PublicKey; accountInfo: FeeAccount }[]> {
  let res = await context.program.account.feeAccount.all();

  let refereeFeeAccounts = res.filter((r) => {
    if (r.account.referrer) {
      let referrer = r.account.referrer;
      if (referrer.toString() == userWalletAddress.toString()) {
        return true;
      }
    }
  });

  return refereeFeeAccounts.map((e) => {
    return {
      publicKey: e.publicKey,
      accountInfo: e.account as unknown as FeeAccount,
    };
  });
}
