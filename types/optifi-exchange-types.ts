export type OptifiExchangeIDL = {
  version: "0.0.0";
  name: "optifi_exchange";
  instructions: [
    {
      name: "initialize";
      accounts: [
        { name: "optifiExchange"; isMut: true; isSigner: false },
        { name: "authority"; isMut: false; isSigner: false },
        { name: "usdcCentralPool"; isMut: false; isSigner: false },
        { name: "payer"; isMut: true; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false }
      ];
      args: [
        { name: "bump"; type: "u8" },
        { name: "data"; type: { defined: "InitializeExchangeData" } }
      ];
    },
    {
      name: "createNewInstrument";
      accounts: [
        { name: "optifiExchange"; isMut: true; isSigner: false },
        { name: "instrument"; isMut: true; isSigner: false },
        { name: "payer"; isMut: true; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "assetSpotPriceOracleFeed"; isMut: false; isSigner: false },
        { name: "assetIvOracleFeed"; isMut: false; isSigner: false },
        { name: "clock"; isMut: false; isSigner: false }
      ];
      args: [
        { name: "bump"; type: "u8" },
        { name: "data"; type: { defined: "ChainData" } }
      ];
    },
    {
      name: "cleanExpiredInstruments";
      accounts: [
        { name: "optifiExchange"; isMut: true; isSigner: false },
        { name: "clock"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "initializeSerumOrderbook";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "market"; isMut: true; isSigner: false },
        { name: "coinMintPk"; isMut: false; isSigner: false },
        { name: "pcMintPk"; isMut: false; isSigner: false },
        { name: "coinVaultPk"; isMut: true; isSigner: false },
        { name: "pcVaultPk"; isMut: true; isSigner: false },
        { name: "bidsPk"; isMut: true; isSigner: true },
        { name: "asksPk"; isMut: true; isSigner: true },
        { name: "reqQPk"; isMut: true; isSigner: true },
        { name: "eventQPk"; isMut: true; isSigner: true },
        { name: "serumMarketAuthority"; isMut: false; isSigner: false },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false },
        { name: "serumDexProgram"; isMut: false; isSigner: false }
      ];
      args: [
        { name: "authorityPk"; type: { option: "publicKey" } },
        { name: "pruneAuthorityPk"; type: { option: "publicKey" } },
        { name: "coinLotSize"; type: "u64" },
        { name: "pcLotSize"; type: "u64" },
        { name: "vaultSignerNonce"; type: "u64" },
        { name: "pcDustThreshold"; type: "u64" }
      ];
    },
    {
      name: "createOptifiMarket";
      accounts: [
        { name: "optifiMarket"; isMut: true; isSigner: false },
        { name: "exchange"; isMut: true; isSigner: false },
        { name: "serumMarket"; isMut: false; isSigner: false },
        { name: "instrument"; isMut: true; isSigner: false },
        { name: "longSplTokenMint"; isMut: false; isSigner: false },
        { name: "shortSplTokenMint"; isMut: false; isSigner: false },
        { name: "payer"; isMut: true; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "clock"; isMut: false; isSigner: false }
      ];
      args: [{ name: "bump"; type: "u8" }];
    },
    {
      name: "initUserOnOptifiMarket";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "user"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: false; isSigner: false },
        { name: "serumOpenOrders"; isMut: true; isSigner: false },
        { name: "optifiMarket"; isMut: false; isSigner: false },
        { name: "serumMarket"; isMut: false; isSigner: false },
        { name: "serumMarketAuthority"; isMut: false; isSigner: false },
        { name: "serumDexProgramId"; isMut: false; isSigner: false },
        { name: "payer"; isMut: false; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false }
      ];
      args: [{ name: "bump"; type: "u8" }];
    },
    {
      name: "initAmmOnOptifiMarket";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "ammAuthority"; isMut: false; isSigner: false },
        { name: "serumOpenOrders"; isMut: true; isSigner: false },
        { name: "optifiMarket"; isMut: false; isSigner: false },
        { name: "serumMarket"; isMut: false; isSigner: false },
        { name: "serumMarketAuthority"; isMut: false; isSigner: false },
        { name: "serumDexProgramId"; isMut: false; isSigner: false },
        { name: "payer"; isMut: false; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false }
      ];
      args: [{ name: "bump"; type: "u8" }];
    },
    {
      name: "updateOptifiMarket";
      accounts: [
        { name: "exchange"; isMut: true; isSigner: false },
        { name: "optifiMarket"; isMut: true; isSigner: false },
        { name: "serumMarket"; isMut: false; isSigner: false },
        { name: "instrument"; isMut: true; isSigner: false },
        { name: "clock"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "placeOrder";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "user"; isMut: false; isSigner: true },
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "userMarginAccount"; isMut: true; isSigner: false },
        { name: "userInstrumentLongTokenVault"; isMut: true; isSigner: false },
        { name: "userInstrumentShortTokenVault"; isMut: true; isSigner: false },
        { name: "optifiMarket"; isMut: false; isSigner: false },
        { name: "serumMarket"; isMut: true; isSigner: false },
        { name: "openOrders"; isMut: true; isSigner: false },
        { name: "requestQueue"; isMut: true; isSigner: false },
        { name: "eventQueue"; isMut: true; isSigner: false },
        { name: "bids"; isMut: true; isSigner: false },
        { name: "asks"; isMut: true; isSigner: false },
        { name: "coinMint"; isMut: true; isSigner: false },
        { name: "coinVault"; isMut: true; isSigner: false },
        { name: "pcVault"; isMut: true; isSigner: false },
        { name: "vaultSigner"; isMut: false; isSigner: false },
        {
          name: "instrumentTokenMintAuthorityPda";
          isMut: false;
          isSigner: false;
        },
        { name: "usdcCentralPool"; isMut: false; isSigner: false },
        { name: "instrumentShortSplTokenMint"; isMut: true; isSigner: false },
        { name: "serumDexProgramId"; isMut: false; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false },
        { name: "assetFeed"; isMut: false; isSigner: false },
        { name: "usdcFeed"; isMut: false; isSigner: false },
        { name: "ivFeed"; isMut: false; isSigner: false },
        { name: "clock"; isMut: false; isSigner: false }
      ];
      args: [
        { name: "side"; type: { defined: "OrderSide" } },
        { name: "limit"; type: "u64" },
        { name: "maxCoinQty"; type: "u64" },
        { name: "maxPcQty"; type: "u64" }
      ];
    },
    {
      name: "cancelOrder";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "user"; isMut: false; isSigner: true },
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "userMarginAccount"; isMut: true; isSigner: false },
        { name: "userInstrumentLongTokenVault"; isMut: true; isSigner: false },
        { name: "userInstrumentShortTokenVault"; isMut: true; isSigner: false },
        { name: "optifiMarket"; isMut: false; isSigner: false },
        { name: "serumMarket"; isMut: true; isSigner: false },
        { name: "openOrders"; isMut: true; isSigner: false },
        { name: "requestQueue"; isMut: true; isSigner: false },
        { name: "eventQueue"; isMut: true; isSigner: false },
        { name: "bids"; isMut: true; isSigner: false },
        { name: "asks"; isMut: true; isSigner: false },
        { name: "coinMint"; isMut: true; isSigner: false },
        { name: "coinVault"; isMut: true; isSigner: false },
        { name: "pcVault"; isMut: true; isSigner: false },
        { name: "vaultSigner"; isMut: false; isSigner: false },
        { name: "usdcCentralPool"; isMut: false; isSigner: false },
        { name: "instrumentShortSplTokenMint"; isMut: true; isSigner: false },
        { name: "serumDexProgramId"; isMut: false; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false }
      ];
      args: [
        { name: "side"; type: { defined: "OrderSide" } },
        { name: "orderId"; type: "u128" }
      ];
    },
    {
      name: "initUserAccount";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "liquidationAccount"; isMut: true; isSigner: false },
        { name: "userMarginAccountUsdc"; isMut: true; isSigner: false },
        { name: "owner"; isMut: true; isSigner: true },
        { name: "payer"; isMut: true; isSigner: true },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false }
      ];
      args: [{ name: "bump"; type: { defined: "InitUserAccountBumpSeeds" } }];
    },
    {
      name: "deposit";
      accounts: [
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "userMarginAccountUsdc"; isMut: true; isSigner: false },
        { name: "depositTokenMint"; isMut: false; isSigner: false },
        { name: "user"; isMut: false; isSigner: true },
        { name: "depositSource"; isMut: true; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false }
      ];
      args: [{ name: "amount"; type: "u64" }];
    },
    {
      name: "withdraw";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "userMarginAccountUsdc"; isMut: true; isSigner: false },
        { name: "depositTokenMint"; isMut: true; isSigner: false },
        { name: "user"; isMut: false; isSigner: true },
        { name: "withdrawDest"; isMut: true; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false }
      ];
      args: [{ name: "amount"; type: "u64" }];
    },
    {
      name: "recordPnlForOneUser";
      accounts: [
        { name: "optifiExchange"; isMut: true; isSigner: false },
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "optifiMarket"; isMut: true; isSigner: false },
        { name: "serumMarket"; isMut: true; isSigner: false },
        { name: "userSerumOpenOrders"; isMut: true; isSigner: false },
        { name: "instrument"; isMut: false; isSigner: false },
        { name: "bids"; isMut: true; isSigner: false },
        { name: "asks"; isMut: true; isSigner: false },
        { name: "eventQueue"; isMut: true; isSigner: false },
        { name: "coinVault"; isMut: true; isSigner: false },
        { name: "pcVault"; isMut: true; isSigner: false },
        { name: "vaultSigner"; isMut: true; isSigner: false },
        { name: "userMarginAccount"; isMut: true; isSigner: false },
        { name: "instrumentLongSplTokenMint"; isMut: true; isSigner: false },
        { name: "instrumentShortSplTokenMint"; isMut: true; isSigner: false },
        { name: "userInstrumentLongTokenVault"; isMut: true; isSigner: false },
        { name: "userInstrumentShortTokenVault"; isMut: true; isSigner: false },
        { name: "pruneAuthority"; isMut: false; isSigner: false },
        { name: "serumDexProgramId"; isMut: false; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "clock"; isMut: false; isSigner: false },
        { name: "assetSpotPriceOracleFeed"; isMut: false; isSigner: false },
        { name: "usdcSpotPriceOracleFeed"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "settleFundForOneUser";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "userMarginAccountUsdc"; isMut: true; isSigner: false },
        { name: "centralUsdcPool"; isMut: true; isSigner: false },
        { name: "centralUsdcPoolAuth"; isMut: false; isSigner: false },
        { name: "usdcMint"; isMut: false; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "cleanExpiredInstrumentsForUser";
      accounts: [
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "optifiExchange"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "settleOrderFunds";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "optifiMarket"; isMut: true; isSigner: false },
        { name: "serumMarket"; isMut: true; isSigner: false },
        { name: "userSerumOpenOrders"; isMut: true; isSigner: false },
        { name: "coinVault"; isMut: true; isSigner: false },
        { name: "pcVault"; isMut: true; isSigner: false },
        { name: "instrumentLongSplTokenMint"; isMut: true; isSigner: false },
        { name: "instrumentShortSplTokenMint"; isMut: true; isSigner: false },
        { name: "userInstrumentLongTokenVault"; isMut: true; isSigner: false },
        { name: "userInstrumentShortTokenVault"; isMut: true; isSigner: false },
        { name: "userMarginAccount"; isMut: true; isSigner: false },
        { name: "vaultSigner"; isMut: true; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "serumDexProgramId"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "initializeAmm";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "amm"; isMut: true; isSigner: false },
        { name: "usdcTokenVault"; isMut: false; isSigner: false },
        { name: "lpTokenMint"; isMut: false; isSigner: false },
        { name: "payer"; isMut: false; isSigner: true },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false }
      ];
      args: [
        { name: "bump"; type: "u8" },
        { name: "data"; type: { defined: "InitializeAMMData" } }
      ];
    },
    {
      name: "ammDeposit";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "amm"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "ammQuoteTokenVault"; isMut: true; isSigner: false },
        { name: "userQuoteTokenVault"; isMut: true; isSigner: false },
        { name: "lpTokenMint"; isMut: true; isSigner: false },
        { name: "ammLiquidityAuth"; isMut: false; isSigner: false },
        { name: "userLpTokenVault"; isMut: true; isSigner: false },
        { name: "user"; isMut: false; isSigner: true },
        { name: "tokenProgram"; isMut: false; isSigner: false }
      ];
      args: [{ name: "amount"; type: "u64" }];
    },
    {
      name: "ammWithdraw";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "amm"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "ammQuoteTokenVault"; isMut: true; isSigner: false },
        { name: "userQuoteTokenVault"; isMut: true; isSigner: false },
        { name: "lpTokenMint"; isMut: true; isSigner: false },
        { name: "ammLiquidityAuth"; isMut: false; isSigner: false },
        { name: "userLpTokenVault"; isMut: true; isSigner: false },
        { name: "user"; isMut: false; isSigner: true },
        { name: "tokenProgram"; isMut: false; isSigner: false }
      ];
      args: [{ name: "amount"; type: "u64" }];
    },
    {
      name: "ammSyncPositions";
      accounts: [
        { name: "amm"; isMut: true; isSigner: false },
        { name: "optifiMarket"; isMut: false; isSigner: false },
        { name: "longTokenVault"; isMut: false; isSigner: false },
        { name: "shortTokenVault"; isMut: false; isSigner: false },
        { name: "serumMarket"; isMut: true; isSigner: false },
        { name: "openOrdersAccount"; isMut: false; isSigner: false },
        { name: "openOrdersOwner"; isMut: false; isSigner: false }
      ];
      args: [{ name: "instrumentIndex"; type: "u16" }];
    },
    {
      name: "ammCalculateDelta";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "amm"; isMut: true; isSigner: false },
        { name: "quoteTokenVault"; isMut: false; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "clock"; isMut: false; isSigner: false },
        { name: "assetFeed"; isMut: false; isSigner: false },
        { name: "usdcFeed"; isMut: false; isSigner: false },
        { name: "ivFeed"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "ammCalculateProposal";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "amm"; isMut: true; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "clock"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "ammUpdateOrders";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "amm"; isMut: true; isSigner: false },
        { name: "ammUsdcVault"; isMut: true; isSigner: false },
        { name: "ammAuthority"; isMut: false; isSigner: false },
        { name: "ammInstrumentLongTokenVault"; isMut: true; isSigner: false },
        { name: "ammInstrumentShortTokenVault"; isMut: true; isSigner: false },
        { name: "optifiMarket"; isMut: false; isSigner: false },
        { name: "serumMarket"; isMut: true; isSigner: false },
        { name: "openOrders"; isMut: true; isSigner: false },
        { name: "requestQueue"; isMut: true; isSigner: false },
        { name: "eventQueue"; isMut: true; isSigner: false },
        { name: "bids"; isMut: true; isSigner: false },
        { name: "asks"; isMut: true; isSigner: false },
        { name: "coinMint"; isMut: true; isSigner: false },
        { name: "coinVault"; isMut: true; isSigner: false },
        { name: "pcVault"; isMut: true; isSigner: false },
        { name: "vaultSigner"; isMut: false; isSigner: false },
        {
          name: "instrumentTokenMintAuthorityPda";
          isMut: false;
          isSigner: false;
        },
        { name: "instrumentShortSplTokenMint"; isMut: true; isSigner: false },
        { name: "pruneAuthority"; isMut: false; isSigner: false },
        { name: "serumDexProgramId"; isMut: false; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false }
      ];
      args: [
        { name: "orderLimit"; type: "u16" },
        { name: "instrumentIndex"; type: "u16" },
        { name: "ammAuthorityBump"; type: "u8" }
      ];
    },
    {
      name: "ammRemoveInstrument";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "amm"; isMut: true; isSigner: false },
        { name: "optifiMarket"; isMut: false; isSigner: false },
        { name: "instrument"; isMut: false; isSigner: false },
        { name: "clock"; isMut: false; isSigner: false }
      ];
      args: [{ name: "instrumentIndex"; type: "u16" }];
    },
    {
      name: "ammAddInstrument";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "amm"; isMut: true; isSigner: false },
        { name: "optifiMarket"; isMut: false; isSigner: false },
        { name: "instrument"; isMut: false; isSigner: false },
        { name: "ammLongTokenVault"; isMut: false; isSigner: false },
        { name: "ammShortTokenVault"; isMut: false; isSigner: false },
        { name: "clock"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "registerMarketMaker";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: false; isSigner: false },
        { name: "marketMakerAccount"; isMut: true; isSigner: false },
        { name: "liquidityPool"; isMut: false; isSigner: false },
        { name: "owner"; isMut: false; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "clock"; isMut: false; isSigner: false }
      ];
      args: [{ name: "bump"; type: "u8" }];
    },
    {
      name: "deregisterMarketMaker";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: false; isSigner: false },
        { name: "marketMaker"; isMut: true; isSigner: false },
        { name: "owner"; isMut: false; isSigner: true }
      ];
      args: [];
    },
    {
      name: "initLiquidation";
      accounts: [
        { name: "userAccount"; isMut: false; isSigner: false },
        { name: "liquidationState"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "registerLiquidationMarket";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: false; isSigner: false },
        { name: "liquidationState"; isMut: true; isSigner: false },
        { name: "market"; isMut: false; isSigner: false },
        { name: "serumMarket"; isMut: false; isSigner: false },
        { name: "serumDexProgramId"; isMut: false; isSigner: false },
        { name: "bids"; isMut: true; isSigner: false },
        { name: "asks"; isMut: true; isSigner: false },
        { name: "eventQueue"; isMut: true; isSigner: false },
        { name: "openOrders"; isMut: true; isSigner: false },
        { name: "openOrdersOwner"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false },
        { name: "userInstrumentLongTokenVault"; isMut: false; isSigner: false },
        { name: "userInstrumentShortTokenVault"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "liquidatePosition";
      accounts: [
        { name: "exchange"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "liquidationState"; isMut: true; isSigner: false },
        { name: "optifiMarket"; isMut: false; isSigner: false },
        { name: "serumMarket"; isMut: true; isSigner: false },
        { name: "serumDexProgramId"; isMut: false; isSigner: false },
        { name: "bids"; isMut: true; isSigner: false },
        { name: "asks"; isMut: true; isSigner: false },
        { name: "eventQueue"; isMut: true; isSigner: false },
        { name: "requestQueue"; isMut: true; isSigner: false },
        { name: "openOrders"; isMut: true; isSigner: false },
        { name: "openOrdersOwner"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false },
        { name: "coinVault"; isMut: true; isSigner: false },
        { name: "pcVault"; isMut: true; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "liquidator"; isMut: true; isSigner: true }
      ];
      args: [
        { name: "maxCoinQty"; type: "u64" },
        { name: "maxPcQty"; type: "u64" }
      ];
    },
    {
      name: "scheduleMarketMakerWithdrawal";
      accounts: [
        { name: "userAccount"; isMut: false; isSigner: false },
        { name: "marketMakerAccount"; isMut: true; isSigner: false },
        { name: "liquidityPool"; isMut: true; isSigner: false },
        { name: "user"; isMut: false; isSigner: true },
        { name: "clock"; isMut: false; isSigner: false }
      ];
      args: [{ name: "amount"; type: "u64" }];
    }
  ];
  accounts: [
    {
      name: "ammAccount";
      type: {
        kind: "struct";
        fields: [
          { name: "optifiExchange"; type: "publicKey" },
          { name: "ammIdx"; type: "u8" },
          { name: "quoteTokenMint"; type: "publicKey" },
          { name: "quoteTokenVault"; type: "publicKey" },
          { name: "lpTokenMint"; type: "publicKey" },
          { name: "ammCapacity"; type: "u64" },
          { name: "bump"; type: "u8" },
          { name: "asset"; type: "u8" },
          { name: "tradingInstruments"; type: { vec: "publicKey" } },
          { name: "positions"; type: { vec: { defined: "Position" } } },
          { name: "proposals"; type: { vec: { defined: "Proposal" } } },
          { name: "state"; type: { defined: "AmmState" } },
          { name: "flags"; type: { vec: "bool" } },
          { name: "iv"; type: "u64" },
          { name: "price"; type: "u64" },
          { name: "netDelta"; type: "i64" },
          { name: "totalLiquidity"; type: "u64" },
          { name: "duration"; type: { defined: "Duration" } },
          { name: "expiryDate"; type: "u64" },
          { name: "contractSize"; type: "u64" }
        ];
      };
    },
    {
      name: "chain";
      type: {
        kind: "struct";
        fields: [
          { name: "asset"; type: "u8" },
          { name: "instrumentType"; type: { defined: "InstrumentType" } },
          { name: "strike"; type: "u64" },
          { name: "expiryDate"; type: "u64" },
          { name: "duration"; type: { defined: "Duration" } },
          { name: "start"; type: "u64" },
          { name: "expiryType"; type: { defined: "ExpiryType" } },
          { name: "authority"; type: "publicKey" },
          { name: "isListedOnMarket"; type: "bool" },
          { name: "contractSize"; type: "u64" }
        ];
      };
    },
    {
      name: "exchange";
      type: {
        kind: "struct";
        fields: [
          { name: "uuid"; type: "string" },
          { name: "version"; type: "u32" },
          { name: "exchangeAuthority"; type: "publicKey" },
          { name: "owner"; type: "publicKey" },
          { name: "usdcMint"; type: "publicKey" },
          { name: "usdcCentralPool"; type: "publicKey" },
          { name: "btcSpotOracle"; type: "publicKey" },
          { name: "ethSpotOracle"; type: "publicKey" },
          { name: "btcIvOracle"; type: "publicKey" },
          { name: "ethIvOracle"; type: "publicKey" },
          {
            name: "markets";
            type: { vec: { defined: "OptifiMarketKeyData" } };
          },
          {
            name: "instruments";
            type: { vec: { defined: "InstrumentKeyData" } };
          }
        ];
      };
    },
    {
      name: "liquidationState";
      type: {
        kind: "struct";
        fields: [
          { name: "userAccount"; type: "publicKey" },
          { name: "status"; type: { defined: "LiquidationStatus" } },
          { name: "registeredPositions"; type: { vec: "publicKey" } },
          {
            name: "collectedPositions";
            type: { vec: { defined: "PositionSizeContainer" } };
          }
        ];
      };
    },
    {
      name: "market";
      type: {
        kind: "struct";
        fields: [
          { name: "version"; type: "i32" },
          { name: "asset"; type: { defined: "Asset" } },
          { name: "marketAuthority"; type: "publicKey" }
        ];
      };
    },
    {
      name: "marketMakerAccount";
      type: {
        kind: "struct";
        fields: [
          { name: "userAccount"; type: "publicKey" },
          { name: "active"; type: "bool" },
          { name: "liquidityPool"; type: "publicKey" },
          { name: "withdrawTs"; type: "u64" },
          { name: "withdrawalAmount"; type: "u64" },
          { name: "outstandingPenalty"; type: "u64" },
          { name: "ethData"; type: { defined: "MarketMakerData" } },
          { name: "btcData"; type: { defined: "MarketMakerData" } }
        ];
      };
    },
    {
      name: "optifiMarket";
      type: {
        kind: "struct";
        fields: [
          { name: "optifiMarketId"; type: "u16" },
          { name: "serumMarket"; type: "publicKey" },
          { name: "instrument"; type: "publicKey" },
          { name: "instrumentLongSplToken"; type: "publicKey" },
          { name: "instrumentShortSplToken"; type: "publicKey" },
          { name: "isStopped"; type: "bool" },
          { name: "bump"; type: "u8" }
        ];
      };
    },
    {
      name: "userAccount";
      type: {
        kind: "struct";
        fields: [
          { name: "optifiExchange"; type: "publicKey" },
          { name: "owner"; type: "publicKey" },
          { name: "userMarginAccountUsdc"; type: "publicKey" },
          { name: "tempPnl"; type: { defined: "TempPnL" } },
          { name: "state"; type: { defined: "AccountState" } },
          { name: "positions"; type: { vec: { defined: "UserPosition" } } },
          { name: "isInLiquidation"; type: "bool" },
          { name: "bump"; type: "u8" }
        ];
      };
    }
  ];
  types: [
    {
      name: "Proposal";
      type: {
        kind: "struct";
        fields: [
          { name: "instrument"; type: "publicKey" },
          { name: "isStarted"; type: "bool" },
          { name: "askOrdersSize"; type: { vec: "u64" } },
          { name: "bidOrdersSize"; type: { vec: "u64" } },
          { name: "askOrdersPrice"; type: { vec: "u64" } },
          { name: "bidOrdersPrice"; type: { vec: "u64" } }
        ];
      };
    },
    {
      name: "ChainData";
      type: {
        kind: "struct";
        fields: [
          { name: "asset"; type: "u8" },
          { name: "instrumentType"; type: "u8" },
          { name: "expiryDate"; type: "u64" },
          { name: "duration"; type: "u8" },
          { name: "start"; type: "u64" },
          { name: "expiryType"; type: "u8" },
          { name: "authority"; type: "publicKey" },
          { name: "contractSize"; type: "u64" },
          { name: "instrumentIdx"; type: "u8" }
        ];
      };
    },
    {
      name: "InstrumentKeyData";
      type: {
        kind: "struct";
        fields: [
          { name: "asset"; type: { defined: "Asset" } },
          { name: "instrumentType"; type: { defined: "InstrumentType" } },
          { name: "strike"; type: "u64" },
          { name: "expiryDate"; type: "u64" },
          { name: "expiryType"; type: { defined: "ExpiryType" } },
          { name: "instrumentPubkey"; type: "publicKey" }
        ];
      };
    },
    {
      name: "OptifiMarketKeyData";
      type: {
        kind: "struct";
        fields: [
          { name: "optifiMarketPubkey"; type: "publicKey" },
          { name: "optifiMarketId"; type: "u16" },
          { name: "serumMarket"; type: "publicKey" },
          { name: "instrument"; type: "publicKey" },
          { name: "expiryDate"; type: "u64" },
          { name: "isStopped"; type: "bool" }
        ];
      };
    },
    {
      name: "InitializeExchangeData";
      type: {
        kind: "struct";
        fields: [
          { name: "uuid"; type: "string" },
          { name: "version"; type: "u32" },
          { name: "exchangeAuthority"; type: "publicKey" },
          { name: "owner"; type: "publicKey" },
          { name: "usdcMint"; type: "publicKey" },
          { name: "btcSpotOracle"; type: "publicKey" },
          { name: "ethSpotOracle"; type: "publicKey" },
          { name: "btcIvOracle"; type: "publicKey" },
          { name: "ethIvOracle"; type: "publicKey" }
        ];
      };
    },
    {
      name: "InitializeAMMData";
      type: {
        kind: "struct";
        fields: [
          { name: "ammIdx"; type: "u8" },
          { name: "ammCapacity"; type: "u64" },
          { name: "bump"; type: "u8" },
          { name: "asset"; type: "u8" },
          { name: "numInstruments"; type: "u8" },
          { name: "duration"; type: "u8" },
          { name: "contractSize"; type: "u64" }
        ];
      };
    },
    {
      name: "InitUserAccountBumpSeeds";
      type: {
        kind: "struct";
        fields: [
          { name: "userAccount"; type: "u8" },
          { name: "liquidationAccount"; type: "u8" }
        ];
      };
    },
    {
      name: "OptionData";
      type: { kind: "struct"; fields: [{ name: "size"; type: "i32" }] };
    },
    {
      name: "PositionSizeContainer";
      type: {
        kind: "struct";
        fields: [
          { name: "size"; type: "u64" },
          { name: "address"; type: "publicKey" }
        ];
      };
    },
    {
      name: "MarketMakerData";
      type: {
        kind: "struct";
        fields: [
          { name: "asset"; type: { defined: "Asset" } },
          { name: "epoch"; type: "u64" },
          { name: "volume"; type: "u64" },
          { name: "totalIndicator"; type: "u64" },
          { name: "timeWeightedIndicator"; type: "u64" },
          { name: "dfmAsk"; type: "u64" }
        ];
      };
    },
    {
      name: "Position";
      type: {
        kind: "struct";
        fields: [
          { name: "instruments"; type: "publicKey" },
          { name: "longTokenVault"; type: "publicKey" },
          { name: "shortTokenVault"; type: "publicKey" },
          { name: "latestPosition"; type: "u64" },
          { name: "usdcBalance"; type: "u64" }
        ];
      };
    },
    {
      name: "StressFunctionResult";
      type: {
        kind: "struct";
        fields: [
          { name: "price"; type: { vec: { vec: { defined: "f64" } } } },
          { name: "regTMargin"; type: { vec: { vec: { defined: "f64" } } } },
          { name: "delta"; type: { vec: { vec: { defined: "f64" } } } },
          {
            name: "intrinsicValue";
            type: { vec: { vec: { defined: "f64" } } };
          },
          {
            name: "stressPriceDelta";
            type: { vec: { vec: { defined: "f64" } } };
          }
        ];
      };
    },
    {
      name: "MarginFunctionResult";
      type: {
        kind: "struct";
        fields: [
          { name: "netQty"; type: "i64" },
          { name: "notionalQty"; type: "i64" },
          { name: "net"; type: { defined: "f64" } },
          { name: "notional"; type: { defined: "f64" } },
          { name: "stressResult"; type: { defined: "f64" } },
          { name: "netIntrinsic"; type: { defined: "f64" } },
          { name: "netPremium"; type: { defined: "f64" } },
          { name: "maturingNetIntrinsic"; type: { defined: "f64" } },
          { name: "maturingPremium"; type: { defined: "f64" } },
          { name: "maturingLiquidity"; type: { defined: "f64" } },
          { name: "totalMargin"; type: { defined: "f64" } },
          { name: "netLeverage"; type: { defined: "f64" } },
          { name: "notionalLeverage"; type: { defined: "f64" } }
        ];
      };
    },
    {
      name: "UserPosition";
      type: {
        kind: "struct";
        fields: [
          { name: "instrument"; type: "publicKey" },
          { name: "longQty"; type: "u64" },
          { name: "shortQty"; type: "u64" }
        ];
      };
    },
    {
      name: "TempPnL";
      type: {
        kind: "struct";
        fields: [
          { name: "amount"; type: "i64" },
          { name: "epoch"; type: "u64" }
        ];
      };
    },
    {
      name: "AmmState";
      type: {
        kind: "enum";
        variants: [
          { name: "Sync" },
          { name: "CalculateDelta" },
          { name: "CalculateProposal" },
          { name: "Execute" }
        ];
      };
    },
    {
      name: "Asset";
      type: {
        kind: "enum";
        variants: [{ name: "Bitcoin" }, { name: "Ethereum" }, { name: "USDC" }];
      };
    },
    {
      name: "Duration";
      type: {
        kind: "enum";
        variants: [{ name: "Weekly" }, { name: "Monthly" }];
      };
    },
    {
      name: "InstrumentType";
      type: { kind: "enum"; variants: [{ name: "Put" }, { name: "Call" }] };
    },
    {
      name: "ExpiryType";
      type: {
        kind: "enum";
        variants: [{ name: "Standard" }, { name: "Perpetual" }];
      };
    },
    { name: "InstrumentData"; type: { kind: "enum"; variants: [] } },
    {
      name: "InstrumentExpiryType";
      type: {
        kind: "enum";
        variants: [{ name: "Standard" }, { name: "Perpetual" }];
      };
    },
    {
      name: "LiquidationStatus";
      type: {
        kind: "enum";
        variants: [{ name: "Liquidating" }, { name: "Dormant" }];
      };
    },
    {
      name: "OracleDataType";
      type: { kind: "enum"; variants: [{ name: "Spot" }, { name: "IV" }] };
    },
    {
      name: "OrderSide";
      type: { kind: "enum"; variants: [{ name: "Bid" }, { name: "Ask" }] };
    },
    {
      name: "SpotInputOption";
      type: {
        kind: "enum";
        variants: [
          { name: "SingleSpot"; fields: [{ defined: "f64" }] },
          { name: "MultiSpots"; fields: [{ vec: { vec: { defined: "f64" } } }] }
        ];
      };
    },
    {
      name: "AccountState";
      type: {
        kind: "enum";
        variants: [
          { name: "Uninitialized" },
          { name: "Initialized" },
          { name: "Frozen" }
        ];
      };
    }
  ];
  errors: [
    {
      code: 300;
      name: "AccountCannotInit";
      msg: "the user account cannot be initialized";
    },
    { code: 301; name: "InvalidAccount"; msg: "the user account is invalid" },
    {
      code: 302;
      name: "UnauthorizedAccount";
      msg: "the account is not owned by the payer";
    },
    {
      code: 303;
      name: "InsufficientFund";
      msg: "the account balance is insufficient";
    },
    { code: 304; name: "TokenTransferFailed"; msg: "Token transfer failed" },
    {
      code: 305;
      name: "UnauthorizedTokenVault";
      msg: "the token vault is not owned by the payer";
    },
    { code: 306; name: "InvalidPDA"; msg: "the provided pda is invalid" },
    {
      code: 307;
      name: "UuidMustBeExactly6Length";
      msg: "Uuid must be exactly of 6 length";
    },
    {
      code: 308;
      name: "NumericalOverflowError";
      msg: "Numerical overflow error!";
    },
    { code: 309; name: "InsufficientMargin"; msg: "Insufficient Margin!" },
    { code: 310; name: "IncorrectCoinMint"; msg: "Incorrect coin mint!" },
    {
      code: 311;
      name: "CannotSettleFundBeforeMarketsStopped";
      msg: "Cannot settle fund befor markets have been stopped!";
    },
    {
      code: 312;
      name: "IncorrectOracleAccount";
      msg: "Incorrect oracle account";
    },
    { code: 313; name: "WrongState"; msg: "the amm state is wrong" },
    {
      code: 314;
      name: "WrongInstrument";
      msg: "the instrument has already been done";
    },
    {
      code: 315;
      name: "NoEnoughOrdersInProposal";
      msg: "no enough orders in proposal to execute";
    },
    {
      code: 316;
      name: "CannotRemoveInstrumentForAMM";
      msg: "cannot remove the instrument for amm";
    },
    {
      code: 317;
      name: "DuplicateInstrumentForAMM";
      msg: "cannot add the instrument for amm due to duplication";
    },
    {
      code: 318;
      name: "UserNotInLiquidation";
      msg: "User is not in liquidation";
    },
    {
      code: 319;
      name: "UserAlreadyInLiquidation";
      msg: "User was already in liquidation";
    },
    {
      code: 320;
      name: "InstrumentAlreadyRegisteredForLiquidation";
      msg: "Instrument was already registered for liquidation";
    },
    {
      code: 321;
      name: "CannotPlaceOrdersInLiquidation";
      msg: "Users cannot place manual orders while their accounts are in liquidation";
    },
    {
      code: 322;
      name: "PoolNotCentralUSDCPool";
      msg: "Provided USDC pool is not central pool";
    },
    {
      code: 323;
      name: "InvalidSerumAuthority";
      msg: "Invalid open orders market authority";
    },
    {
      code: 324;
      name: "WithdrawRequestInvalid";
      msg: "Only one withdraw request allowed at one time";
    },
    {
      code: 325;
      name: "MMWithdrawNotInWindow";
      msg: "Market maker withdraw outside of valid window";
    },
    { code: 326; name: "WrongAsset"; msg: "Wrong asset" }
  ];
};
import { IdlAccounts } from "@project-serum/anchor";

export type AmmState = Record<string, Record<string, any>>;
export const AmmState = {
  Sync: { sync: {} },
  CalculateDelta: { calculatedelta: {} },
  CalculateProposal: { calculateproposal: {} },
  Execute: { execute: {} },
};

export type Asset = Record<string, Record<string, any>>;
export const Asset = {
  Bitcoin: { bitcoin: {} },
  Ethereum: { ethereum: {} },
  USDC: { usdc: {} },
};

export type Duration = Record<string, Record<string, any>>;
export const Duration = {
  Weekly: { weekly: {} },
  Monthly: { monthly: {} },
};

export type InstrumentType = Record<string, Record<string, any>>;
export const InstrumentType = {
  Put: { put: {} },
  Call: { call: {} },
};

export type ExpiryType = Record<string, Record<string, any>>;
export const ExpiryType = {
  Standard: { standard: {} },
  Perpetual: { perpetual: {} },
};

export type InstrumentData = Record<string, Record<string, any>>;
export const InstrumentData = {};

export type InstrumentExpiryType = Record<string, Record<string, any>>;
export const InstrumentExpiryType = {
  Standard: { standard: {} },
  Perpetual: { perpetual: {} },
};

export type LiquidationStatus = Record<string, Record<string, any>>;
export const LiquidationStatus = {
  Liquidating: { liquidating: {} },
  Dormant: { dormant: {} },
};

export type OracleDataType = Record<string, Record<string, any>>;
export const OracleDataType = {
  Spot: { spot: {} },
  IV: { iv: {} },
};

export type OrderSide = Record<string, Record<string, any>>;
export const OrderSide = {
  Bid: { bid: {} },
  Ask: { ask: {} },
};

export type SpotInputOption = Record<string, Record<string, any>>;
export const SpotInputOption = {
  SingleSpot: { singlespot: {} },
  MultiSpots: { multispots: {} },
};

export type AccountState = Record<string, Record<string, any>>;
export const AccountState = {
  Uninitialized: { uninitialized: {} },
  Initialized: { initialized: {} },
  Frozen: { frozen: {} },
};

export type AmmAccount = IdlAccounts<OptifiExchangeIDL>["ammAccount"];

export type Chain = IdlAccounts<OptifiExchangeIDL>["chain"];

export type Exchange = IdlAccounts<OptifiExchangeIDL>["exchange"];

export type LiquidationState =
  IdlAccounts<OptifiExchangeIDL>["liquidationState"];

export type Market = IdlAccounts<OptifiExchangeIDL>["market"];

export type MarketMakerAccount =
  IdlAccounts<OptifiExchangeIDL>["marketMakerAccount"];

export type OptifiMarket = IdlAccounts<OptifiExchangeIDL>["optifiMarket"];

export type UserAccount = IdlAccounts<OptifiExchangeIDL>["userAccount"];
