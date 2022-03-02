# Optifi SDK

TypeScript interfaces for working with the on-chain Optifi system

## Configuration

Configuration variables can be specified either through environment variables,
or provided to `initializeContext` at runtime

**Optional Environment Variables**:

- `OPTIFI_WALLET`: the filepath of a Solana wallet
- `OPTIFI_PROGRAM_ID`: The ID of the on chain Optifi program to interact with

## How to trade
- bootstrap a new exchange(do only once)
```bash
npx ts-ndoe scripts/bootstrap.ts
```
it will create a new exchange with the OPTIFI_EXCHANGE_ID set in `./constants.ts`, also create optifi markets that users can trade on. Each optifi market will list one tradable instrument and using a seperate Serum orderbook to place orders.

- create user account on the exchange
```bash
npx ts-ndoe scripts/createUserAccountIfNotExists.ts
```

- deposit fund (optifi USDC) to user's margin account (1000 usdc by default)
```bash
npx ts-ndoe scripts/createUserAccountIfNotExists.ts
```

- select an optifi market to trade
copy the optifi market address and paste it to the scripts used below

- init the user on the optifi market (only for first time)
```bash
npx ts-ndoe scripts/initUserOnMarket.ts 
```

- place ask/bid orders
```bash
npx ts-ndoe scripts/placeOrder.ts  
```

- check the orderbook
```bash
npx ts-node scripts/loadMarketOrderbook.ts
```
