# OptiFi SDK

TypeScript interfaces for working with the on-chain OptiFi system

## Configuration

Configuration variables can be specified either through environment variables,
or provided to `initializeContext` at runtime

**Optional Environment Variables**:

- `OPTIFI_WALLET`: the filepath of a Solana wallet
- `OPTIFI_PROGRAM_ID`: The ID of the on chain OptiFi program to interact with. If you don't want to deploy the OptiFi program by yourself, try using the program id deployed on devnet: `FVWhLLPYPPPVtmrAwSgsy4cF84z888hamnyXYdtFN2jT`

## How to initialize a new OptiFi Exchange

- bootstrap a new exchange(do only once)

```bash
npx ts-node scripts/bootstrap.ts
```

it will create a new exchange with the OPTIFI_EXCHANGE_ID set in `./constants.ts`, also create OptiFi markets that users can trade on. Each OptiFi market will list one tradable instrument and using a seperate Serum orderbook to place orders.

- load the exchange info
  npx ts-node scripts/loadExchange.ts

## How to trade

- create user account on the exchange

```bash
npx ts-node scripts/createUserAccountIfNotExists.ts
```

- deposit fund (OptiFi USDC) to user's margin account (1000 usdc by default)

```bash
npx ts-node scripts/createUserAccountIfNotExists.ts
```

- find all available markets and select an OptiFi market to trade

```bash
npx ts-node scripts/findOptifiMarkets.ts
```

it will print all the market info, find the address of any OptiFi market.
`Copy the OptiFi market address you want to trade and paste it to appropriate places in all the the scripts which are going to be used below`

- init the user on the OptiFi market (only for first time)

```bash
npx ts-node scripts/user/initUserOnMarket.ts
```

It basically creates an open orders accounts for the Serum orderbook which is used the OptiFi market. Each user will have one open orders accounts for one OptiFi market.

- check the current orderbook data

```bash
npx ts-node scripts/loadMarketOrderbook.ts
```

- place ask/bid orders

```bash
npx ts-node scripts/order/placeOrder.ts
```

- check the orderbook again after new order placed

```bash
npx ts-node scripts/loadOpenOdersAccount.ts
```

- check the orderbook again after new order placed

```bash
npx ts-node scripts/loadMarketOrderbook.ts
```

## How to run AMMs

- create an AMM

```bash
npx ts-node scripts/amm/initializeAMMs.ts
```

It will create two AMMs, one for trading BTC options, another for trading ETH options

- to get the info of created BTC/ETH AMMs, run:

```bash
npx ts-node scripts/amm/findAMMs.ts
```

- to deposit USDC into an AMM, set the `amm address` and `amount to deposit`, and run:

```bash
npx ts-node scripts/amm/deposit.ts
```

- add the optifi markets to an AMM so that it can trade on that market

```bash
npx ts-node scripts/amm/addInstrumentToAmm.ts
```

- make sure you have done the last two steps for BOTH BTC and ETH AMMs

- now the amm is ready to work, run the following command to crank the AMM and let the AMM update orders on OptiFi markets contineously:

```bash
npx ts-node scripts/amm/crankAMM.ts
```

Note that in order to calculate Delta and order proposals for the AMMs, it requires the Margin Stress account to be at `available` status. run the following and stop when the Margin Stress account becomes `available`:

```bash
npx ts-node scripts/marginStress/marginStressLoop.ts
```

run the following to check the current state of the Margin Stress account

```bash
npx ts-node scripts/marginStress/marginStressLoop.ts
```

After the BTC or ETH AMM starts to run, orders should be placed on all BTC or ETH related OptiFi markets and updated contineously.

## Debug

Error: failed to get info about account : FetchError: request to https://api.devnet.solana.com/ failed, reason: read ECONNRESET

Solution: It's because of the busy Solana network. just wait for a while and try again
