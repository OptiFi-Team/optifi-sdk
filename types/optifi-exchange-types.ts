export type OptifiExchangeIDL = {"version":"0.0.0","name":"optifi_exchange","instructions":[{"name":"initialize","accounts":[{"name":"optifiExchange","isMut":true,"isSigner":false},{"name":"authority","isMut":false,"isSigner":false},{"name":"payer","isMut":true,"isSigner":true},{"name":"systemProgram","isMut":false,"isSigner":false},{"name":"rent","isMut":false,"isSigner":false}],"args":[{"name":"bump","type":"u8"},{"name":"data","type":{"defined":"Exchange"}}]},{"name":"createNewInstrument","accounts":[{"name":"instrument0","isMut":true,"isSigner":false},{"name":"instrument1","isMut":true,"isSigner":false},{"name":"instrument2","isMut":true,"isSigner":false},{"name":"instrument3","isMut":true,"isSigner":false},{"name":"instrument4","isMut":true,"isSigner":false},{"name":"instrument5","isMut":true,"isSigner":false},{"name":"instrument6","isMut":true,"isSigner":false},{"name":"instrument7","isMut":true,"isSigner":false},{"name":"instrument8","isMut":true,"isSigner":false},{"name":"payer","isMut":true,"isSigner":true},{"name":"systemProgram","isMut":false,"isSigner":false},{"name":"rent","isMut":false,"isSigner":false}],"args":[{"name":"bump","type":"u8"},{"name":"data","type":{"defined":"Chain"}}]},{"name":"initializeMarket0","accounts":[{"name":"market","isMut":true,"isSigner":false},{"name":"coinMintPk","isMut":false,"isSigner":false},{"name":"pcMintPk","isMut":false,"isSigner":false},{"name":"coinVaultPk","isMut":true,"isSigner":false},{"name":"pcVaultPk","isMut":true,"isSigner":false},{"name":"bidsPk","isMut":true,"isSigner":true},{"name":"asksPk","isMut":true,"isSigner":true},{"name":"reqQPk","isMut":true,"isSigner":true},{"name":"eventQPk","isMut":true,"isSigner":true},{"name":"systemProgram","isMut":false,"isSigner":false},{"name":"rent","isMut":false,"isSigner":false},{"name":"serumDexProgramId","isMut":false,"isSigner":false}],"args":[{"name":"authorityPk","type":{"option":"publicKey"}},{"name":"pruneAuthorityPk","type":{"option":"publicKey"}},{"name":"coinLotSize","type":"u64"},{"name":"pcLotSize","type":"u64"},{"name":"vaultSignerNonce","type":"u64"},{"name":"pcDustThreshold","type":"u64"}]},{"name":"initializeMarket","accounts":[{"name":"market","isMut":true,"isSigner":false},{"name":"instrumentPk","isMut":true,"isSigner":false},{"name":"instrumentVaultPk","isMut":false,"isSigner":false},{"name":"tokenMint","isMut":false,"isSigner":false},{"name":"marketAuthority","isMut":false,"isSigner":false},{"name":"specifiers","isMut":false,"isSigner":false},{"name":"tokenProgram","isMut":false,"isSigner":false},{"name":"pcMintPk","isMut":false,"isSigner":false},{"name":"pcVaultPk","isMut":true,"isSigner":false},{"name":"bidsPk","isMut":true,"isSigner":true},{"name":"asksPk","isMut":true,"isSigner":true},{"name":"reqQPk","isMut":true,"isSigner":true},{"name":"eventQPk","isMut":true,"isSigner":true},{"name":"owner","isMut":true,"isSigner":true},{"name":"systemProgram","isMut":false,"isSigner":false},{"name":"rent","isMut":false,"isSigner":false},{"name":"serumDexProgramId","isMut":false,"isSigner":false}],"args":[{"name":"authorityPk","type":{"option":"publicKey"}},{"name":"pruneAuthorityPk","type":{"option":"publicKey"}},{"name":"coinLotSize","type":"u64"},{"name":"pcLotSize","type":"u64"},{"name":"vaultSignerNonce","type":"u64"},{"name":"pcDustThreshold","type":"u64"}]},{"name":"createOptifiMarket","accounts":[{"name":"optifiMarket","isMut":true,"isSigner":false},{"name":"exchange","isMut":true,"isSigner":false},{"name":"serumMarket","isMut":false,"isSigner":false},{"name":"coinMint","isMut":false,"isSigner":false},{"name":"instrument","isMut":true,"isSigner":false},{"name":"payer","isMut":true,"isSigner":true},{"name":"systemProgram","isMut":false,"isSigner":false},{"name":"clock","isMut":false,"isSigner":false}],"args":[{"name":"bump","type":"u8"}]},{"name":"initUserOnOptifiMarket","accounts":[{"name":"optifiExchange","isMut":false,"isSigner":false},{"name":"dexOpenOrders","isMut":true,"isSigner":false},{"name":"optifiMarket","isMut":false,"isSigner":false},{"name":"serumMarket","isMut":false,"isSigner":false},{"name":"serumDexProgramId","isMut":false,"isSigner":false},{"name":"payer","isMut":false,"isSigner":true},{"name":"pda","isMut":false,"isSigner":false},{"name":"systemProgram","isMut":false,"isSigner":false},{"name":"rent","isMut":false,"isSigner":false}],"args":[{"name":"bump","type":"u8"}]},{"name":"settleFundForExpiredMarket","accounts":[{"name":"optifiMarket","isMut":true,"isSigner":false},{"name":"serumMarket","isMut":false,"isSigner":false},{"name":"instrument","isMut":false,"isSigner":false},{"name":"clock","isMut":false,"isSigner":false}],"args":[]},{"name":"updateOptifiMarket","accounts":[{"name":"optifiMarket","isMut":true,"isSigner":false},{"name":"serumMarket","isMut":false,"isSigner":false},{"name":"instrument","isMut":true,"isSigner":false},{"name":"clock","isMut":false,"isSigner":false}],"args":[]},{"name":"placeOrder","accounts":[{"name":"exchange","isMut":false,"isSigner":false},{"name":"user","isMut":false,"isSigner":false},{"name":"userMarginAccount","isMut":false,"isSigner":false},{"name":"userInstrumentSplAccount","isMut":false,"isSigner":false},{"name":"optifiMarket","isMut":false,"isSigner":false},{"name":"serumMarket","isMut":true,"isSigner":false},{"name":"openOrders","isMut":true,"isSigner":false},{"name":"openOrdersOwner","isMut":false,"isSigner":false},{"name":"requestQueue","isMut":true,"isSigner":false},{"name":"eventQueue","isMut":true,"isSigner":false},{"name":"bids","isMut":true,"isSigner":false},{"name":"asks","isMut":true,"isSigner":false},{"name":"coinMint","isMut":true,"isSigner":false},{"name":"coinVault","isMut":true,"isSigner":false},{"name":"pcVault","isMut":true,"isSigner":false},{"name":"vaultSigner","isMut":false,"isSigner":false},{"name":"orderPayerTokenAccount","isMut":true,"isSigner":false},{"name":"serumDexProgramId","isMut":false,"isSigner":false},{"name":"pda","isMut":false,"isSigner":false},{"name":"tokenProgram","isMut":false,"isSigner":false},{"name":"rent","isMut":false,"isSigner":false}],"args":[{"name":"side","type":{"defined":"OrderSide"}},{"name":"limit","type":"u64"},{"name":"maxCoinQty","type":"u64"},{"name":"maxPcQty","type":"u64"}]},{"name":"updateOrder","accounts":[],"args":[]},{"name":"cancelOrder","accounts":[],"args":[]},{"name":"initUserAccount","accounts":[{"name":"optifiExchange","isMut":false,"isSigner":false},{"name":"userAccount","isMut":true,"isSigner":false},{"name":"userVaultOwnedByPda","isMut":true,"isSigner":false},{"name":"owner","isMut":true,"isSigner":true},{"name":"payer","isMut":true,"isSigner":true},{"name":"tokenProgram","isMut":false,"isSigner":false},{"name":"systemProgram","isMut":false,"isSigner":false},{"name":"rent","isMut":false,"isSigner":false}],"args":[{"name":"bump","type":"u8"}]},{"name":"deposit","accounts":[{"name":"userAccount","isMut":true,"isSigner":false},{"name":"userVaultOwnedByPda","isMut":true,"isSigner":false},{"name":"depositTokenMint","isMut":true,"isSigner":false},{"name":"depositor","isMut":false,"isSigner":true},{"name":"depositSource","isMut":true,"isSigner":false},{"name":"tokenProgram","isMut":false,"isSigner":false}],"args":[{"name":"amount","type":"u64"}]},{"name":"withdraw","accounts":[{"name":"optifiExchange","isMut":false,"isSigner":false},{"name":"userAccount","isMut":true,"isSigner":false},{"name":"userVaultOwnedByPda","isMut":true,"isSigner":false},{"name":"pda","isMut":false,"isSigner":false},{"name":"depositTokenMint","isMut":true,"isSigner":false},{"name":"depositor","isMut":false,"isSigner":true},{"name":"withdrawDest","isMut":true,"isSigner":false},{"name":"tokenProgram","isMut":false,"isSigner":false}],"args":[{"name":"amount","type":"u64"}]}],"accounts":[{"name":"chain","type":{"kind":"struct","fields":[{"name":"asset","type":{"defined":"Asset"}},{"name":"instrumentType","type":{"defined":"InstrumentType"}},{"name":"strike","type":"u64"},{"name":"expiryDate","type":"u64"},{"name":"duration","type":"u64"},{"name":"start","type":"u64"},{"name":"expiryType","type":{"defined":"ExpiryType"}},{"name":"authority","type":"publicKey"},{"name":"isListedOnMarket","type":"bool"}]}},{"name":"marketSpecifiers","type":{"kind":"struct","fields":[{"name":"asset","type":{"array":["u8",1]}},{"name":"strike","type":{"array":["u8",1]}},{"name":"perpetual","type":{"array":["u8",1]}},{"name":"instrumentType","type":{"array":["u8",1]}}]}},{"name":"exchange","type":{"kind":"struct","fields":[{"name":"uuid","type":"string"},{"name":"version","type":"u32"},{"name":"exchangeAuthority","type":"publicKey"},{"name":"owner","type":"publicKey"},{"name":"markets","type":{"vec":"publicKey"}},{"name":"instruments","type":{"vec":"publicKey"}}]}},{"name":"market","type":{"kind":"struct","fields":[{"name":"version","type":"i32"},{"name":"asset","type":{"defined":"Asset"}},{"name":"marketAuthority","type":"publicKey"}]}},{"name":"optifiMarket","type":{"kind":"struct","fields":[{"name":"optifiMarketId","type":"u16"},{"name":"serumMarket","type":"publicKey"},{"name":"instrument","type":"publicKey"},{"name":"isStopped","type":"bool"}]}},{"name":"userAccount","type":{"kind":"struct","fields":[{"name":"owner","type":"publicKey"},{"name":"userVaultOwnedByPda","type":"publicKey"},{"name":"reserve","type":"u64"},{"name":"state","type":{"defined":"AccountState"}},{"name":"positions","type":"u16"},{"name":"bump","type":"u8"}]}}],"types":[{"name":"ChainData","type":{"kind":"struct","fields":[{"name":"asset","type":{"defined":"Asset"}},{"name":"instrumentType","type":{"defined":"InstrumentType"}},{"name":"expiryDate","type":"u64"},{"name":"duration","type":"u64"},{"name":"start","type":"u64"},{"name":"expiryType","type":{"defined":"ExpiryType"}},{"name":"authority","type":"publicKey"},{"name":"isListedOnMarket","type":"bool"}]}},{"name":"InitChainBumpSeeds","type":{"kind":"struct","fields":[{"name":"instrument0","type":"u8"},{"name":"instrument1","type":"u8"},{"name":"instrument2","type":"u8"},{"name":"instrument3","type":"u8"},{"name":"instrument4","type":"u8"},{"name":"instrument5","type":"u8"},{"name":"instrument6","type":"u8"},{"name":"instrument7","type":"u8"},{"name":"instrument8","type":"u8"}]}},{"name":"OptionData","type":{"kind":"struct","fields":[{"name":"size","type":"i32"}]}},{"name":"Asset","type":{"kind":"enum","variants":[{"name":"Bitcoin"},{"name":"Ethereum"}]}},{"name":"InstrumentType","type":{"kind":"enum","variants":[{"name":"Option"},{"name":"Future"}]}},{"name":"ExpiryType","type":{"kind":"enum","variants":[{"name":"Standard"},{"name":"Perpetual"}]}},{"name":"InstrumentData","type":{"kind":"enum","variants":[]}},{"name":"InstrumentExpiryType","type":{"kind":"enum","variants":[{"name":"Standard"},{"name":"Perpetual"}]}},{"name":"OrderSide","type":{"kind":"enum","variants":[{"name":"Bid"},{"name":"Ask"}]}},{"name":"SpotInputOption","type":{"kind":"enum","variants":[{"name":"SingleSpot","fields":[{"defined":"f64"}]},{"name":"MultiSpots","fields":[{"vec":{"vec":{"defined":"f64"}}}]}]}},{"name":"AccountState","type":{"kind":"enum","variants":[{"name":"Uninitialized"},{"name":"Initialized"},{"name":"Frozen"}]}}],"errors":[{"code":300,"name":"AccountCannotInit","msg":"the user account cannot be initialized"},{"code":301,"name":"InvalidAccount","msg":"the user account is invalid"},{"code":302,"name":"UnauthorizedAccount","msg":"the account is not owned by the payer"},{"code":303,"name":"InsufficientFund","msg":"the account balance is insufficient"},{"code":304,"name":"TokenTransferFailed","msg":"Token transfer failed"},{"code":305,"name":"UnauthorizedTokenVault","msg":"the token vault is not owned by the payer"},{"code":306,"name":"InvalidPDA","msg":"the provided pda is invalid"},{"code":307,"name":"UuidMustBeExactly6Length","msg":"Uuid must be exactly of 6 length"},{"code":308,"name":"NumericalOverflowError","msg":"Numerical overflow error!"},{"code":309,"name":"InsufficientMargin","msg":"Insufficient Margin!"},{"code":310,"name":"IncorrectCoinMint","msg":"Incorrect coin mint!"}],"metadata":{"address":"6YXU1nvVYqmRtFy3wGoqDsJcCs4Pojjo3U6h5Fc46MTE"}};
import { IdlAccounts } from '@project-serum/anchor';

export type Asset = Record<string, Record<string, any>>
export const Asset = {
  Bitcoin: { bitcoin: {} },
  Ethereum: { ethereum: {} }
}
    

export type InstrumentType = Record<string, Record<string, any>>
export const InstrumentType = {
  Option: { option: {} },
  Future: { future: {} }
}
    

export type ExpiryType = Record<string, Record<string, any>>
export const ExpiryType = {
  Standard: { standard: {} },
  Perpetual: { perpetual: {} }
}
    

export type InstrumentData = Record<string, Record<string, any>>
export const InstrumentData = {
  
}
    

export type InstrumentExpiryType = Record<string, Record<string, any>>
export const InstrumentExpiryType = {
  Standard: { standard: {} },
  Perpetual: { perpetual: {} }
}
    

export type OrderSide = Record<string, Record<string, any>>
export const OrderSide = {
  Bid: { bid: {} },
  Ask: { ask: {} }
}
    

export type AccountState = Record<string, Record<string, any>>
export const AccountState = {
  Uninitialized: { uninitialized: {} },
  Initialized: { initialized: {} },
  Frozen: { frozen: {} }
}
    

  

export type Chain = IdlAccounts<OptifiExchangeIDL>["chain"]

export type MarketSpecifiers = IdlAccounts<OptifiExchangeIDL>["marketSpecifiers"]

export type Market = IdlAccounts<OptifiExchangeIDL>["market"]

export type UserAccount = IdlAccounts<OptifiExchangeIDL>["userAccount"]
  
          