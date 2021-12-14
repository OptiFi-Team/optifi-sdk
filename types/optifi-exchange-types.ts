export type OptifiExchangeIDL = {"version":"0.0.0","name":"optifi_exchange","instructions":[{"name":"initialize","accounts":[],"args":[]},{"name":"createNewInstrument","accounts":[{"name":"instrument","isMut":true,"isSigner":false},{"name":"payer","isMut":true,"isSigner":true},{"name":"systemProgram","isMut":false,"isSigner":false},{"name":"rent","isMut":false,"isSigner":false}],"args":[{"name":"bump","type":"u8"},{"name":"data","type":{"defined":"Chain"}}]},{"name":"initializeMarket","accounts":[{"name":"market","isMut":true,"isSigner":false},{"name":"instrumentPk","isMut":true,"isSigner":false},{"name":"instrumentVaultPk","isMut":false,"isSigner":false},{"name":"tokenMint","isMut":false,"isSigner":false},{"name":"marketAuthority","isMut":false,"isSigner":false},{"name":"specifiers","isMut":false,"isSigner":false},{"name":"tokenProgram","isMut":false,"isSigner":false},{"name":"pcMintPk","isMut":false,"isSigner":false},{"name":"pcVaultPk","isMut":true,"isSigner":false},{"name":"bidsPk","isMut":true,"isSigner":true},{"name":"asksPk","isMut":true,"isSigner":true},{"name":"reqQPk","isMut":true,"isSigner":true},{"name":"eventQPk","isMut":true,"isSigner":true},{"name":"owner","isMut":true,"isSigner":true},{"name":"systemProgram","isMut":false,"isSigner":false},{"name":"rent","isMut":false,"isSigner":false},{"name":"serumDexProgramId","isMut":false,"isSigner":false}],"args":[{"name":"authorityPk","type":{"option":"publicKey"}},{"name":"pruneAuthorityPk","type":{"option":"publicKey"}},{"name":"coinLotSize","type":"u64"},{"name":"pcLotSize","type":"u64"},{"name":"vaultSignerNonce","type":"u64"},{"name":"pcDustThreshold","type":"u64"}]},{"name":"placeOrder","accounts":[{"name":"market","isMut":true,"isSigner":false},{"name":"openOrders","isMut":true,"isSigner":false},{"name":"requestQueue","isMut":true,"isSigner":false},{"name":"eventQueue","isMut":true,"isSigner":false},{"name":"bids","isMut":true,"isSigner":false},{"name":"asks","isMut":true,"isSigner":false},{"name":"coinVault","isMut":true,"isSigner":false},{"name":"pcVault","isMut":true,"isSigner":false},{"name":"vaultSigner","isMut":false,"isSigner":false},{"name":"orderPayerTokenAccount","isMut":false,"isSigner":true},{"name":"tokenProgram","isMut":false,"isSigner":false},{"name":"marketAuthority","isMut":false,"isSigner":false},{"name":"serumDexProgramId","isMut":false,"isSigner":false},{"name":"rent","isMut":false,"isSigner":false}],"args":[{"name":"side","type":{"defined":"OrderSide"}},{"name":"limit","type":"u64"},{"name":"maxCoinQty","type":"u64"},{"name":"maxPcQty","type":"u64"}]},{"name":"updateOrder","accounts":[],"args":[]},{"name":"cancelOrder","accounts":[],"args":[]},{"name":"initUserAccount","accounts":[{"name":"userAccount","isMut":true,"isSigner":false},{"name":"userVaultOwnedByPda","isMut":true,"isSigner":false},{"name":"owner","isMut":true,"isSigner":true},{"name":"payer","isMut":true,"isSigner":true},{"name":"tokenProgram","isMut":false,"isSigner":false},{"name":"systemProgram","isMut":false,"isSigner":false},{"name":"rent","isMut":false,"isSigner":false}],"args":[{"name":"bump","type":"u8"}]},{"name":"deposit","accounts":[{"name":"userAccount","isMut":true,"isSigner":false},{"name":"userVaultOwnedByPda","isMut":true,"isSigner":false},{"name":"depositTokenMint","isMut":true,"isSigner":false},{"name":"depositor","isMut":false,"isSigner":true},{"name":"depositSource","isMut":true,"isSigner":false},{"name":"tokenProgram","isMut":false,"isSigner":false}],"args":[{"name":"amount","type":"u64"}]},{"name":"withdraw","accounts":[{"name":"userAccount","isMut":true,"isSigner":false},{"name":"userVaultOwnedByPda","isMut":true,"isSigner":false},{"name":"pda","isMut":false,"isSigner":false},{"name":"depositTokenMint","isMut":true,"isSigner":false},{"name":"depositor","isMut":false,"isSigner":true},{"name":"withdrawDest","isMut":true,"isSigner":false},{"name":"tokenProgram","isMut":false,"isSigner":false}],"args":[{"name":"amount","type":"u64"}]}],"accounts":[{"name":"chain","type":{"kind":"struct","fields":[{"name":"asset","type":{"defined":"Asset"}},{"name":"instrumentType","type":{"defined":"InstrumentType"}},{"name":"strike","type":"u64"},{"name":"expiryDate","type":"u64"},{"name":"duration","type":"u64"},{"name":"start","type":"u64"},{"name":"expiryType","type":{"defined":"ExpiryType"}},{"name":"authority","type":"publicKey"},{"name":"isListedOnMarket","type":"bool"}]}},{"name":"marketSpecifiers","type":{"kind":"struct","fields":[{"name":"asset","type":{"array":["u8",1]}},{"name":"strike","type":{"array":["u8",1]}},{"name":"perpetual","type":{"array":["u8",1]}},{"name":"instrumentType","type":{"array":["u8",1]}}]}},{"name":"market","type":{"kind":"struct","fields":[{"name":"version","type":"i32"},{"name":"asset","type":{"defined":"Asset"}},{"name":"marketAuthority","type":"publicKey"}]}},{"name":"userAccount","type":{"kind":"struct","fields":[{"name":"owner","type":"publicKey"},{"name":"userVaultOwnedByPda","type":"publicKey"},{"name":"reserve","type":"u64"},{"name":"state","type":{"defined":"AccountState"}},{"name":"positions","type":"u16"},{"name":"bump","type":"u8"}]}}],"types":[{"name":"OptionData","type":{"kind":"struct","fields":[{"name":"size","type":"i32"}]}},{"name":"Asset","type":{"kind":"enum","variants":[{"name":"Bitcoin"},{"name":"Ethereum"}]}},{"name":"InstrumentType","type":{"kind":"enum","variants":[{"name":"Option"},{"name":"Future"}]}},{"name":"ExpiryType","type":{"kind":"enum","variants":[{"name":"Standard"},{"name":"Perpetual"}]}},{"name":"InstrumentData","type":{"kind":"enum","variants":[]}},{"name":"InstrumentExpiryType","type":{"kind":"enum","variants":[{"name":"Standard"},{"name":"Perpetual"}]}},{"name":"OrderSide","type":{"kind":"enum","variants":[{"name":"Bid"},{"name":"Ask"}]}},{"name":"AccountState","type":{"kind":"enum","variants":[{"name":"Uninitialized"},{"name":"Initialized"},{"name":"Frozen"}]}}],"errors":[{"code":300,"name":"AccountCannotInit","msg":"the user account cannot be initialized"},{"code":301,"name":"InvalidAccount","msg":"the user account is invalid"},{"code":302,"name":"UnauthorizedAccount","msg":"the account is not owned by the payer"},{"code":303,"name":"InsufficientFund","msg":"the account balance is insufficient"},{"code":304,"name":"TokenTransferFailed","msg":"Token transfer failed"},{"code":305,"name":"UnauthorizedTokenVault","msg":"the token vault is not owned by the payer"},{"code":306,"name":"InvalidPDA","msg":"the provided pda is invalid"}]};
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
  
          