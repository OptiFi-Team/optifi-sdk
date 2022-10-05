export type OptifiExchangeIDL = {
  version: "1.2.2";
  name: "optifi_exchange";
  instructions: [
    {
      name: "initialize";
      docs: ["Initialize OptiFi Exchange"];
      accounts: [
        { name: "optifiExchange"; isMut: true; isSigner: false; docs: ["optifi exchange account"] },
        { name: "authority"; isMut: false; isSigner: false; docs: ["optifi exchange's authority"] },
        {
          name: "usdcCentralPool";
          isMut: false;
          isSigner: false;
          docs: ["usdc central pool for fund settlement, its authority should be the central_usdc_pool_auth_pda"];
        },
        {
          name: "usdcFeePool";
          isMut: false;
          isSigner: false;
          docs: ["usdc fee pool for trade fee collection, its authority should be the central_usdc_pool_auth_pda"];
        },
        { name: "payer"; isMut: true; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false }
      ];
      args: [{ name: "bump"; type: "u8" }, { name: "data"; type: { defined: "InitializeExchangeData" } }];
    },
    {
      name: "createNewInstrument";
      docs: ["Create a new instrument with specified data"];
      accounts: [
        { name: "optifiExchange"; isMut: true; isSigner: false },
        { name: "instrument"; isMut: true; isSigner: false },
        { name: "payer"; isMut: true; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "assetSpotPriceOracleFeed"; isMut: false; isSigner: false },
        { name: "marginStressAccount"; isMut: true; isSigner: false }
      ];
      args: [{ name: "bump"; type: "u8" }, { name: "data"; type: { defined: "ChainData" } }];
    },
    {
      name: "generateNextInstrument";
      docs: ["dynamically add instruments with new strikes"];
      accounts: [
        { name: "optifiExchange"; isMut: true; isSigner: false },
        { name: "instrument"; isMut: true; isSigner: false },
        { name: "instrument2"; isMut: true; isSigner: false },
        { name: "payer"; isMut: true; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "assetSpotPriceOracleFeed"; isMut: false; isSigner: false },
        { name: "marginStressAccount"; isMut: true; isSigner: false }
      ];
      args: [
        { name: "bump"; type: "u8" },
        { name: "bump2"; type: "u8" },
        { name: "data"; type: { defined: "ChainData" } },
        { name: "data2"; type: { defined: "ChainData" } }
      ];
    },
    {
      name: "cleanExpiredInstruments";
      docs: ["Clean the expired instruments"];
      accounts: [
        { name: "optifiExchange"; isMut: true; isSigner: false },
        { name: "clock"; isMut: false; isSigner: false; docs: ["Clock to get the timestamp"] }
      ];
      args: [];
    },
    {
      name: "initializeSerumOrderbook";
      docs: ["Initialize a new serum market(orderbook)"];
      accounts: [
        {
          name: "optifiExchange";
          isMut: false;
          isSigner: false;
          docs: [
            "0. `[writable]` the market to initialize",
            "1. `[writable]` zeroed out request queue",
            "2. `[writable]` zeroed out event queue",
            "3. `[writable]` zeroed out bids",
            "4. `[writable]` zeroed out asks",
            "5. `[writable]` spl-token account for the coin currency",
            "6. `[writable]` spl-token account for the price currency",
            "7. `[]` coin currency Mint",
            "8. `[]` price currency Mint",
            "9. `[]` the rent sysvar",
            "10. `[]` open orders market authority (optional)",
            "11. `[]` prune authority (optional, requires open orders market authority)",
            "12. `[]` crank authority (optional, requires prune authority)"
          ];
        },
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
        { name: "coinLotSize"; type: "u64" },
        { name: "pcLotSize"; type: "u64" },
        { name: "vaultSignerNonce"; type: "u64" },
        { name: "pcDustThreshold"; type: "u64" }
      ];
    },
    {
      name: "createOptifiMarket";
      docs: ["Create a new optifi market with an instrument listed on it"];
      accounts: [
        { name: "optifiMarket"; isMut: true; isSigner: false; docs: ["The optifi market to be created"] },
        { name: "exchange"; isMut: true; isSigner: false; docs: ["OptiFi Exchange account"] },
        { name: "serumMarket"; isMut: false; isSigner: false; docs: ["the serum market on which the instrument will be listed"] },
        { name: "instrument"; isMut: true; isSigner: false; docs: ["The instrument to be listed"] },
        {
          name: "longSplTokenMint";
          isMut: false;
          isSigner: false;
          docs: [
            "the mint address of spl token for buyers of the instrument,",
            "it should be the base currency for the serum orderbook",
            "it's mint authority should be this optifi_market_mint_auth pda"
          ];
        },
        {
          name: "shortSplTokenMint";
          isMut: false;
          isSigner: false;
          docs: ["the mint address of spl token for sellers of the instrument,", "it's mint authority should be this optifi_market_mint_auth pda"];
        },
        { name: "payer"; isMut: true; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "clock"; isMut: false; isSigner: false }
      ];
      args: [{ name: "bump"; type: "u8" }];
    },
    {
      name: "stopOptifiMarket";
      docs: ["Stop an optifi market which is expired"];
      accounts: [
        { name: "optifiExchange"; isMut: true; isSigner: false; docs: ["OptiFi Exchange account"] },
        { name: "optifiMarket"; isMut: true; isSigner: false; docs: ["The optifi market to be updated"] },
        { name: "instrument"; isMut: true; isSigner: false; docs: ["The instrument listed on market"] },
        { name: "instrumentLongSplToken"; isMut: false; isSigner: false; docs: ["instrumentlong token mint address"] },
        { name: "instrumentShortSplToken"; isMut: false; isSigner: false; docs: ["instrument short token mint address"] },
        { name: "clock"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "updateOptifiMarket";
      docs: ["Update a stopped optifi market with a new instrument"];
      accounts: [
        { name: "exchange"; isMut: true; isSigner: false; docs: ["OptiFi Exchange account"] },
        { name: "optifiMarket"; isMut: true; isSigner: false; docs: ["The optifi market to be updated"] },
        { name: "instrument"; isMut: true; isSigner: false; docs: ["The instrument to be listed"] },
        { name: "instrumentLongSplToken"; isMut: false; isSigner: false; docs: ["Long token mint of the optifi_market"] },
        { name: "clock"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "initUserOnOptifiMarket";
      docs: ["Init an open orders for the user to place orders on an optifi market"];
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "user"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "serumOpenOrders"; isMut: true; isSigner: false; docs: ["The account to use for placing orders on the DEX"] },
        { name: "optifiMarket"; isMut: false; isSigner: false; docs: ["The optifi market to initialize for"] },
        { name: "serumMarket"; isMut: false; isSigner: false; docs: ["the serum market the optifi market is using"] },
        {
          name: "serumMarketAuthority";
          isMut: false;
          isSigner: false;
          docs: ["serum market authority which is required when init open orders if it is Some()"];
        },
        { name: "serumDexProgramId"; isMut: false; isSigner: false },
        { name: "payer"; isMut: true; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false }
      ];
      args: [{ name: "bump"; type: "u8" }];
    },
    {
      name: "initAmmOnOptifiMarket";
      docs: ["Init an open orders account for the amm to place orders on an optifi market"];
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "ammAuthority"; isMut: false; isSigner: false; docs: ["the amm to init"] },
        { name: "serumOpenOrders"; isMut: true; isSigner: false; docs: ["The account to use for placing orders on the DEX"] },
        { name: "optifiMarket"; isMut: false; isSigner: false; docs: ["The optifi market to initialize for"] },
        { name: "serumMarket"; isMut: false; isSigner: false; docs: ["the serum market the optifi market is using"] },
        {
          name: "serumMarketAuthority";
          isMut: false;
          isSigner: false;
          docs: ["serum market authority which is required when init open orders if it is Some()"];
        },
        { name: "serumDexProgramId"; isMut: false; isSigner: false },
        { name: "payer"; isMut: true; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false }
      ];
      args: [{ name: "bump"; type: "u8" }];
    },
    {
      name: "placeOrder";
      docs: ["Submit a limit order"];
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false; docs: ["optifi_exchange account"] },
        { name: "marginStressAccount"; isMut: false; isSigner: false },
        { name: "user"; isMut: false; isSigner: true; docs: ["the user's wallet"] },
        { name: "userAccount"; isMut: true; isSigner: false; docs: ["user's optifi account"] },
        { name: "userMarginAccount"; isMut: true; isSigner: false; docs: ["user's margin account which is controlled by a pda"] },
        {
          name: "userInstrumentLongTokenVault";
          isMut: true;
          isSigner: false;
          docs: [
            "user's instrument long spl token account which is controlled by a the user's user account(pda)",
            "it stands for how many contracts the user sold for the instrument",
            "and it should be the same as order_payer_token_account if the order is ask order"
          ];
        },
        {
          name: "userInstrumentShortTokenVault";
          isMut: true;
          isSigner: false;
          docs: [
            "user's instrument short spl token account which is controlled by a the user's user account(pda)",
            "it stands for how many contracts the user bought for the instrument"
          ];
        },
        { name: "optifiMarket"; isMut: false; isSigner: false; docs: ["optifi market that binds an instrument with a serum market(orderbook)"] },
        { name: "serumMarket"; isMut: true; isSigner: false; docs: ["the serum market(orderbook)"] },
        { name: "openOrders"; isMut: true; isSigner: false; docs: ["the user's open orders account"] },
        { name: "requestQueue"; isMut: true; isSigner: false },
        { name: "eventQueue"; isMut: true; isSigner: false },
        { name: "bids"; isMut: true; isSigner: false },
        { name: "asks"; isMut: true; isSigner: false },
        { name: "coinMint"; isMut: true; isSigner: false; docs: ['The token mint address of "base" currency, aka the instrument long spl token'] },
        { name: "coinVault"; isMut: true; isSigner: false; docs: ['The vault for the "base" currency'] },
        { name: "pcVault"; isMut: true; isSigner: false; docs: ['The vault for the "quote" currency'] },
        { name: "instrumentTokenMintAuthorityPda"; isMut: false; isSigner: false; docs: ["the mint authoriity of both long and short spl tokens"] },
        { name: "usdcFeePool"; isMut: true; isSigner: false },
        { name: "instrumentShortSplTokenMint"; isMut: true; isSigner: false; docs: ["the instrument short spl token"] },
        { name: "serumDexProgramId"; isMut: false; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false },
        { name: "feeAccount"; isMut: true; isSigner: false }
      ];
      args: [
        { name: "side"; type: { defined: "OrderSide" } },
        { name: "limit"; type: "u64" },
        { name: "maxCoinQty"; type: "u64" },
        { name: "maxPcQty"; type: "u64" },
        { name: "orderType"; type: "u8" }
      ];
    },
    {
      name: "cancelOrderByClientOrderId";
      docs: ["Cancel a previously placed order"];
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false; docs: ["optifi_exchange account"] },
        { name: "marginStressAccount"; isMut: false; isSigner: false },
        { name: "user"; isMut: false; isSigner: true; docs: ["the user's wallet"] },
        { name: "userAccount"; isMut: true; isSigner: false; docs: ["user's optifi account"] },
        { name: "userMarginAccount"; isMut: true; isSigner: false; docs: ["user's margin account which is controlled by a pda"] },
        { name: "serumMarket"; isMut: true; isSigner: false; docs: ["the serum market(orderbook)"] },
        { name: "openOrders"; isMut: true; isSigner: false; docs: ["the user's open orders account"] },
        { name: "eventQueue"; isMut: true; isSigner: false },
        { name: "bids"; isMut: true; isSigner: false },
        { name: "asks"; isMut: true; isSigner: false },
        { name: "usdcFeePool"; isMut: true; isSigner: false },
        { name: "centralUsdcPoolAuth"; isMut: false; isSigner: false },
        { name: "serumDexProgramId"; isMut: false; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "feeAccount"; isMut: true; isSigner: false }
      ];
      args: [{ name: "side"; type: { defined: "OrderSide" } }, { name: "clientOrderId"; type: "u64" }];
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
        { name: "serumDexProgramId"; isMut: false; isSigner: false },
        { name: "feeAccount"; isMut: true; isSigner: false }
      ];
      args: [];
    },
    {
      name: "consumeEventQueue";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "serumMarket"; isMut: true; isSigner: false },
        { name: "eventQueue"; isMut: true; isSigner: false },
        { name: "userSerumOpenOrders"; isMut: true; isSigner: false },
        { name: "consumeEventsAuthority"; isMut: false; isSigner: false },
        { name: "serumDexProgramId"; isMut: false; isSigner: false }
      ];
      args: [{ name: "limit"; type: { option: "u16" } }];
    },
    {
      name: "initUserAccount";
      docs: ["Initialize user's optifi account"];
      accounts: [
        { name: "optifiExchange"; isMut: true; isSigner: false; docs: ["the optifi_exchange account"] },
        { name: "userAccount"; isMut: true; isSigner: false; docs: ["the user's optifi account to be initialized"] },
        { name: "liquidationAccount"; isMut: true; isSigner: false; docs: ["the user's liquidation account to be initialized for liquidation use"] },
        { name: "userMarginAccountUsdc"; isMut: true; isSigner: false; docs: ["the margin account into which user will deposits spl token"] },
        { name: "owner"; isMut: false; isSigner: true; docs: ["owner of the user account"] },
        { name: "payer"; isMut: true; isSigner: true; docs: ["payer to pay accounts rent fee"] },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false }
      ];
      args: [{ name: "bump"; type: { defined: "InitUserAccountBumpSeeds" } }];
    },
    {
      name: "deposit";
      docs: ["Deposit usdc tokens into user's margin account"];
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: true; isSigner: false; docs: ["user account - also the pda that controls the user's spl token accounts"] },
        { name: "userMarginAccountUsdc"; isMut: true; isSigner: false; docs: ["user's margin account whose authority is user account(pda)"] },
        { name: "user"; isMut: false; isSigner: true; docs: ["The owner of user account"] },
        { name: "depositSource"; isMut: true; isSigner: false; docs: ["from address - user's usdc token account with the usdc tokens to be deposited"] },
        { name: "tokenProgram"; isMut: false; isSigner: false }
      ];
      args: [{ name: "amount"; type: "u64" }];
    },
    {
      name: "withdraw";
      docs: ["Withdrawal usdc tokens from user's margin account"];
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: false; isSigner: false; docs: ["user account - also the pda that controls the user's spl token accounts"] },
        { name: "userMarginAccountUsdc"; isMut: true; isSigner: false; docs: ["user's margin account whose authority is user account(pda)"] },
        { name: "user"; isMut: false; isSigner: true; docs: ["The owner of user account"] },
        { name: "withdrawDest"; isMut: true; isSigner: false; docs: ["the destination token account to which funds will be withdrawed"] },
        { name: "tokenProgram"; isMut: false; isSigner: false }
      ];
      args: [{ name: "amount"; type: "u64" }];
    },
    {
      name: "userMarginCalculate";
      docs: ["Re-calculate user's margin requirement"];
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false; docs: ["optifi_exchange account"] },
        { name: "marginStressAccount"; isMut: false; isSigner: false; docs: ["margin stress account"] },
        { name: "userAccount"; isMut: true; isSigner: false; docs: ["user's optifi account"] }
      ];
      args: [];
    },
    {
      name: "recordPnlForOneUser";
      docs: ["Fund settlement - cranker function", "Record pnl for one user on one optifi market(one instruments)"];
      accounts: [
        { name: "optifiExchange"; isMut: true; isSigner: false; docs: ["optifi exchange account"] },
        { name: "userAccount"; isMut: true; isSigner: false; docs: ["the user's optifi account"] },
        { name: "optifiMarket"; isMut: true; isSigner: false; docs: ["The optifi market to be settled"] },
        { name: "serumMarket"; isMut: true; isSigner: false; docs: ["the serum market which the optifi market is using"] },
        { name: "userSerumOpenOrders"; isMut: true; isSigner: false; docs: ["the user's serum open orders account"] },
        { name: "instrument"; isMut: false; isSigner: false; docs: ["The expired instrument"] },
        { name: "bids"; isMut: true; isSigner: false },
        { name: "asks"; isMut: true; isSigner: false },
        { name: "eventQueue"; isMut: true; isSigner: false },
        { name: "coinVault"; isMut: true; isSigner: false },
        { name: "pcVault"; isMut: true; isSigner: false; docs: ['The vault for the "quote" currency'] },
        { name: "vaultSigner"; isMut: true; isSigner: false; docs: ["serum market vault owner (pda)"] },
        { name: "userMarginAccountUsdc"; isMut: true; isSigner: false },
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
      docs: ["Fund settlement - cranker function", "Settle fund for one user for all markets with same expiry date - simultaneous settlement"];
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false; docs: ["optifi exchange account"] },
        { name: "userAccount"; isMut: true; isSigner: false; docs: ["The optifi market to be settled"] },
        { name: "userMarginAccountUsdc"; isMut: true; isSigner: false; docs: ["user's margin account"] },
        { name: "centralUsdcPool"; isMut: true; isSigner: false; docs: ["a central fund pool for fund settlemnet purpose"] },
        { name: "centralUsdcPoolAuth"; isMut: false; isSigner: false },
        { name: "usdcMint"; isMut: false; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "recordPnlForAmm";
      docs: ["Fund settlement - cranker function", "Record pnl for amm on one optifi market(one instruments)"];
      accounts: [
        { name: "optifiExchange"; isMut: true; isSigner: false; docs: ["optifi exchange account"] },
        { name: "ammAccount"; isMut: true; isSigner: false; docs: ["amm account to record pnl for"] },
        { name: "optifiMarket"; isMut: true; isSigner: false; docs: ["The optifi market to be settled"] },
        { name: "serumMarket"; isMut: true; isSigner: false; docs: ["the serum market which the optifi market is using"] },
        { name: "ammSerumOpenOrders"; isMut: true; isSigner: false; docs: ["the amm's serum open orders account"] },
        { name: "instrument"; isMut: false; isSigner: false; docs: ["The expired instrument"] },
        { name: "bids"; isMut: true; isSigner: false },
        { name: "asks"; isMut: true; isSigner: false },
        { name: "eventQueue"; isMut: true; isSigner: false },
        { name: "coinVault"; isMut: true; isSigner: false },
        { name: "pcVault"; isMut: true; isSigner: false; docs: ['The vault for the "quote" currency'] },
        { name: "vaultSigner"; isMut: true; isSigner: false; docs: ["serum market vault owner (pda)"] },
        { name: "ammUsdcVault"; isMut: true; isSigner: false },
        { name: "instrumentLongSplTokenMint"; isMut: true; isSigner: false },
        { name: "instrumentShortSplTokenMint"; isMut: true; isSigner: false },
        { name: "ammInstrumentLongTokenVault"; isMut: true; isSigner: false },
        { name: "ammInstrumentShortTokenVault"; isMut: true; isSigner: false },
        { name: "pruneAuthority"; isMut: false; isSigner: false },
        { name: "serumDexProgramId"; isMut: false; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "clock"; isMut: false; isSigner: false },
        { name: "assetSpotPriceOracleFeed"; isMut: false; isSigner: false },
        { name: "usdcSpotPriceOracleFeed"; isMut: false; isSigner: false },
        { name: "ammLiquidityAuth"; isMut: false; isSigner: false; docs: ["the authority of amm's amm_usdc_vault"] }
      ];
      args: [{ name: "ammAuthorityBump"; type: "u8" }];
    },
    {
      name: "settleFundForAmm";
      docs: ["Fund settlement - cranker function", "Settle fund for one user for all markets with same expiry date - simultaneous settlement"];
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false; docs: ["optifi exchange account"] },
        { name: "ammAccount"; isMut: true; isSigner: false; docs: ["amm account to settle"] },
        { name: "ammUsdcVault"; isMut: true; isSigner: false; docs: ["usdc vault of amm account"] },
        { name: "ammLiquidityAuth"; isMut: false; isSigner: false; docs: ["the authority of amm's amm_usdc_vault"] },
        { name: "centralUsdcPool"; isMut: true; isSigner: false; docs: ["a central fund pool for fund settlemnet purpose"] },
        { name: "centralUsdcPoolAuth"; isMut: false; isSigner: false },
        { name: "usdcMint"; isMut: false; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "cleanExpiredInstrumentsForUser";
      docs: ["Clean the expired instruments for user"];
      accounts: [{ name: "userAccount"; isMut: true; isSigner: false }, { name: "optifiExchange"; isMut: false; isSigner: false }];
      args: [];
    },
    {
      name: "initializeAmm";
      docs: ["Initialize AMM"];
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false; docs: ["the optifi exchange"] },
        { name: "amm"; isMut: true; isSigner: false; docs: ["the amm account to be initialized"] },
        { name: "withdrawQueue"; isMut: true; isSigner: false; docs: ["amm withdraw request queue"] },
        {
          name: "usdcTokenVault";
          isMut: false;
          isSigner: false;
          docs: ["its token mint must be the usdc recogonized by optifi exchange, and owner is amm's liquidity auth pda"];
        },
        { name: "lpTokenMint"; isMut: false; isSigner: false; docs: ["amm's lp token mint address, whose mint authority is amm's liquidity auth pda"] },
        { name: "ammLiqudityAuth"; isMut: false; isSigner: false; docs: ["authority of usdc_token_vault and lp_token_mint"] },
        { name: "payer"; isMut: true; isSigner: true; docs: ["The user that owns the deposits"] },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false },
        { name: "mangoProgram"; isMut: false; isSigner: false; docs: ["mango accounts for amm delta hedging on mango market"] },
        { name: "mangoGroup"; isMut: true; isSigner: false },
        { name: "ammMangoAccount"; isMut: true; isSigner: false; docs: ["amm's mango account on mango market"] },
        { name: "perpMarket"; isMut: false; isSigner: false; docs: ["mango perp market which has the same underlying asset for amm hedging"] }
      ];
      args: [{ name: "bump"; type: "u8" }, { name: "data"; type: { defined: "InitializeAMMData" } }];
    },
    {
      name: "ammDeposit";
      docs: ["Deposit funds to AMM"];
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "amm"; isMut: true; isSigner: false; docs: ["the amm to which user will deposits funds"] },
        { name: "ammQuoteTokenVault"; isMut: true; isSigner: false; docs: ["The quote token vault of amm - usdc vault"] },
        { name: "userQuoteTokenVault"; isMut: true; isSigner: false; docs: ["user's quote token vault from which user will transfer funds"] },
        { name: "lpTokenMint"; isMut: true; isSigner: false; docs: ["amm's lp token mint address"] },
        { name: "ammLiquidityAuth"; isMut: false; isSigner: false; docs: ["amm's lp token mint authority, and usdc vault authority"] },
        {
          name: "userLpTokenVault";
          isMut: true;
          isSigner: false;
          docs: [
            "user's token vault for receiving lp tokens",
            "in order to calc the performance fee, the authority of the lp token vault must be user account"
          ];
        },
        { name: "userAccount"; isMut: true; isSigner: false; docs: ["The user account that owns the deposits"] },
        { name: "owner"; isMut: false; isSigner: true; docs: ["The user that owns the user account"] },
        { name: "tokenProgram"; isMut: false; isSigner: false }
      ];
      args: [{ name: "amount"; type: "u64" }];
    },
    {
      name: "addWithdrawRequest";
      docs: ["Add a request to withdraw queue"];
      accounts: [
        { name: "amm"; isMut: true; isSigner: false; docs: ["the amm from which user will withdraw funds"] },
        { name: "withdrawQueue"; isMut: true; isSigner: false; docs: ["amm withdraw request queue"] },
        { name: "userLpTokenVault"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: true; isSigner: false; docs: ["The user account that owns the deposits"] },
        { name: "owner"; isMut: false; isSigner: true; docs: ["The user that owns the user account"] },
        { name: "clock"; isMut: false; isSigner: false }
      ];
      args: [{ name: "amount"; type: "u64" }];
    },
    {
      name: "consumeWithdrawQueue";
      docs: ["Consume withdraw queue"];
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false; docs: ["optifi exchange"] },
        { name: "usdcFeePool"; isMut: true; isSigner: false; docs: ["exchange usdc fee pool for collecting amm withdraw fees"] },
        { name: "amm"; isMut: true; isSigner: false; docs: ["the amm from which user will withdraw funds"] },
        { name: "marginStressAccount"; isMut: false; isSigner: false; docs: ["margin stress account"] },
        { name: "withdrawQueue"; isMut: true; isSigner: false; docs: ["amm withdraw request queue"] },
        { name: "ammQuoteTokenVault"; isMut: true; isSigner: false; docs: ["The quote token vault of the amm"] },
        { name: "userQuoteTokenVault"; isMut: true; isSigner: false; docs: ["user's quote token vault from which user will transfer funds"] },
        { name: "lpTokenMint"; isMut: true; isSigner: false; docs: ["amm's lp token mint address"] },
        { name: "ammLiquidityAuth"; isMut: true; isSigner: false; docs: ["amm's lp token mint authority, and usdc vault authority"] },
        { name: "userLpTokenVault"; isMut: true; isSigner: false; docs: ["user's lp token vault"] },
        { name: "userAccount"; isMut: true; isSigner: false; docs: ["The user account that owns the deposits"] },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "authority"; isMut: false; isSigner: false },
        { name: "optifiUsdc"; isMut: true; isSigner: false },
        { name: "usdcVault"; isMut: true; isSigner: false },
        { name: "usdcMint"; isMut: false; isSigner: false },
        { name: "userUsdcTokenVault"; isMut: true; isSigner: false },
        { name: "optifiUsdcProgram"; isMut: false; isSigner: false },
        { name: "associatedTokenProgram"; isMut: false; isSigner: false },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "ammSyncPositions";
      docs: ["Sync AMM opsitions"];
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false; docs: ["optifi exchange"] },
        { name: "amm"; isMut: true; isSigner: false; docs: ["amm account"] },
        { name: "optifiMarket"; isMut: false; isSigner: false; docs: ["the optifi market where the instrumnet to be synced is listed"] },
        { name: "longTokenVault"; isMut: false; isSigner: false; docs: ["amm's base token vault (Long position)"] },
        { name: "shortTokenVault"; isMut: false; isSigner: false; docs: ["amm's base token vault (Short position)"] },
        { name: "serumMarket"; isMut: false; isSigner: false; docs: ["the serum market(orderbook)"] },
        { name: "openOrdersAccount"; isMut: false; isSigner: false; docs: ["the open orders account"] },
        { name: "openOrdersOwner"; isMut: false; isSigner: false }
      ];
      args: [{ name: "instrumentIndex"; type: "u16" }];
    },
    {
      name: "ammSyncFuturePositions";
      docs: ["Sync AMM Future opsitions"];
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false; docs: ["optifi exchange"] },
        { name: "amm"; isMut: true; isSigner: false; docs: ["amm account"] },
        { name: "mangoProgram"; isMut: false; isSigner: false; docs: ["mango program"] },
        { name: "mangoGroup"; isMut: false; isSigner: false; docs: ["user's mango account"] },
        { name: "mangoGroupSigner"; isMut: false; isSigner: false },
        { name: "mangoAccount"; isMut: true; isSigner: false; docs: ["user's mango account"] },
        { name: "owner"; isMut: true; isSigner: false; docs: ["owner of mango_account"] },
        { name: "mangoCache"; isMut: true; isSigner: false },
        { name: "rootBank"; isMut: true; isSigner: false },
        { name: "nodeBank"; isMut: true; isSigner: false },
        { name: "vault"; isMut: true; isSigner: false },
        { name: "ammQuoteTokenVault"; isMut: true; isSigner: false },
        { name: "payer"; isMut: false; isSigner: true },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "eventQueue"; isMut: true; isSigner: false },
        { name: "perpMarket"; isMut: true; isSigner: false },
        { name: "bids"; isMut: true; isSigner: false },
        { name: "asks"; isMut: true; isSigner: false },
        { name: "authority"; isMut: false; isSigner: false },
        { name: "optifiUsdcMint"; isMut: true; isSigner: false },
        { name: "usdcVault"; isMut: true; isSigner: false },
        { name: "usdcMint"; isMut: false; isSigner: false },
        { name: "ammUsdcTokenAccount"; isMut: true; isSigner: false },
        { name: "optifiUsdcProgram"; isMut: false; isSigner: false },
        { name: "associatedTokenProgram"; isMut: false; isSigner: false },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false }
      ];
      args: [{ name: "perpMarketIndex"; type: "u8" }];
    },
    {
      name: "ammUpdateFutureOrders";
      docs: ["Place AMM future orders"];
      accounts: [
        { name: "amm"; isMut: true; isSigner: false; docs: ["amm account"] },
        { name: "mangoProgram"; isMut: false; isSigner: false; docs: ["mango program"] },
        { name: "mangoGroup"; isMut: false; isSigner: false; docs: ["user's mango account"] },
        { name: "mangoAccount"; isMut: true; isSigner: false; docs: ["user's mango account"] },
        { name: "owner"; isMut: false; isSigner: false; docs: ["owner of mango_account"] },
        { name: "mangoCache"; isMut: true; isSigner: false },
        { name: "perpMarket"; isMut: true; isSigner: false },
        { name: "bids"; isMut: true; isSigner: false },
        { name: "asks"; isMut: true; isSigner: false },
        { name: "eventQueue"; isMut: true; isSigner: false },
        { name: "rootBank"; isMut: true; isSigner: false },
        { name: "nodeBank"; isMut: true; isSigner: false },
        { name: "vault"; isMut: true; isSigner: false },
        { name: "ownerTokenAccount"; isMut: true; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "ammCalculateDelta";
      docs: ["Calculate AMM delta"];
      accounts: [
        { name: "marginStressAccount"; isMut: false; isSigner: false; docs: ["margin stress account"] },
        { name: "amm"; isMut: true; isSigner: false; docs: ["amm account"] },
        { name: "quoteTokenVault"; isMut: false; isSigner: false; docs: ["amm's quote token vault to get the USDC balance"] },
        { name: "lpTokenMint"; isMut: false; isSigner: false; docs: ["amm's lp token mint address"] }
      ];
      args: [];
    },
    {
      name: "ammCalculateProposal";
      docs: ["Calculate orders to update and save the orders in proposal"];
      accounts: [
        { name: "marginStressAccount"; isMut: false; isSigner: false; docs: ["margin stress account"] },
        { name: "amm"; isMut: true; isSigner: false; docs: ["amm account"] }
      ];
      args: [];
    },
    {
      name: "ammUpdateOrders";
      docs: ["Update AMM orders (place new orders)"];
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false; docs: ["optifi exchange account"] },
        { name: "amm"; isMut: true; isSigner: false; docs: ["the amm to update oders for"] },
        { name: "ammUsdcVault"; isMut: true; isSigner: false; docs: ["amm's margin account(usdc vault) which is controlled by amm_authority (a pda)"] },
        { name: "ammAuthority"; isMut: false; isSigner: false },
        { name: "ammInstrumentLongTokenVault"; isMut: true; isSigner: false; docs: ["amm's instrument long spl token account"] },
        { name: "ammInstrumentShortTokenVault"; isMut: true; isSigner: false; docs: ["amm's instrument short spl token account"] },
        {
          name: "optifiMarket";
          isMut: false;
          isSigner: false;
          docs: ["optifi market that binds an instrument with a serum market(orderbook)", "it's also the mint authority of the instrument spl token"];
        },
        { name: "serumMarket"; isMut: true; isSigner: false; docs: ["the serum market(orderbook)"] },
        { name: "instrument"; isMut: false; isSigner: false; docs: ["the instrument listed on optifi_market"] },
        { name: "openOrders"; isMut: true; isSigner: false; docs: ["amm's open orders account for this optifi market,", "its owner is amm account(pda)"] },
        { name: "requestQueue"; isMut: true; isSigner: false },
        { name: "eventQueue"; isMut: true; isSigner: false },
        { name: "bids"; isMut: true; isSigner: false },
        { name: "asks"; isMut: true; isSigner: false },
        { name: "coinMint"; isMut: true; isSigner: false; docs: ['The token mint address of "base" currency, aka the instrument long spl token'] },
        { name: "coinVault"; isMut: true; isSigner: false; docs: ['The vault for the "base" currency'] },
        { name: "pcVault"; isMut: true; isSigner: false; docs: ['The vault for the "quote" currency'] },
        { name: "vaultSigner"; isMut: false; isSigner: false; docs: ["serum market vault owner (pda)"] },
        { name: "instrumentTokenMintAuthorityPda"; isMut: false; isSigner: false; docs: ["the mint authoriity of both long and short spl tokens"] },
        { name: "instrumentShortSplTokenMint"; isMut: true; isSigner: false; docs: ["the instrument short spl token"] },
        { name: "pruneAuthority"; isMut: false; isSigner: false },
        { name: "serumDexProgramId"; isMut: false; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false }
      ];
      args: [
        { name: "orderLimit"; type: "u16" },
        { name: "instrumentIndex"; type: "u16" },
        { name: "ammAuthorityBump"; type: "u8" },
        { name: "marketAuthBump"; type: "u8" }
      ];
    },
    {
      name: "ammRemoveInstrument";
      docs: ["Remove instrument for AMM"];
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "amm"; isMut: true; isSigner: false; docs: ["the amm"] },
        { name: "instrument"; isMut: false; isSigner: false; docs: ["the instrumnet to remove from amm's trading instrument list"] },
        { name: "clock"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "ammAddInstrument";
      docs: ["Add instrument for AMM"];
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "amm"; isMut: true; isSigner: false; docs: ["the amm"] },
        { name: "optifiMarket"; isMut: false; isSigner: false; docs: ["the optifi_market which list the instrument"] },
        { name: "instrument"; isMut: false; isSigner: false; docs: ["the instrumnet to add into amm's trading instrument list, it must not be expired"] },
        { name: "ammLongTokenVault"; isMut: false; isSigner: false },
        { name: "ammShortTokenVault"; isMut: false; isSigner: false },
        { name: "clock"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "marginStressInit";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "marginStressAccount"; isMut: true; isSigner: false },
        { name: "payer"; isMut: true; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false }
      ];
      args: [{ name: "bump"; type: "u8" }, { name: "asset"; type: "u8" }];
    },
    {
      name: "marginStressCalculate";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false; docs: ["optifi_exchange account"] },
        { name: "marginStressAccount"; isMut: true; isSigner: false },
        { name: "assetFeed"; isMut: false; isSigner: false },
        { name: "usdcFeed"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "updateIv";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "marginStressAccount"; isMut: true; isSigner: false },
        { name: "signer"; isMut: false; isSigner: true }
      ];
      args: [{ name: "iv"; type: "f64" }, { name: "timestamp"; type: "u64" }];
    },
    {
      name: "initLiquidation";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "userMarginAccountUsdc"; isMut: false; isSigner: false; docs: ["user's margin account whose authority is user account(pda)"] },
        { name: "liquidationState"; isMut: true; isSigner: false }
      ];
      args: [];
    },
    {
      name: "liquidationRegister";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "marginStressAccount"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "userMarginAccount"; isMut: true; isSigner: false },
        { name: "liquidationState"; isMut: true; isSigner: false },
        { name: "market"; isMut: false; isSigner: false },
        { name: "serumMarket"; isMut: true; isSigner: false },
        { name: "serumDexProgramId"; isMut: false; isSigner: false },
        { name: "bids"; isMut: true; isSigner: false },
        { name: "asks"; isMut: true; isSigner: false },
        { name: "eventQueue"; isMut: true; isSigner: false },
        { name: "openOrders"; isMut: true; isSigner: false },
        { name: "pruneAuthority"; isMut: false; isSigner: false },
        { name: "coinVault"; isMut: true; isSigner: false },
        { name: "pcVault"; isMut: true; isSigner: false },
        { name: "vaultSigner"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "instrumentLongSplTokenMint"; isMut: true; isSigner: false },
        { name: "instrumentShortSplTokenMint"; isMut: true; isSigner: false },
        { name: "userInstrumentLongTokenVault"; isMut: true; isSigner: false },
        { name: "userInstrumentShortTokenVault"; isMut: true; isSigner: false }
      ];
      args: [];
    },
    {
      name: "liquidationPlaceOrder";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "marginStressAccount"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "userMarginAccount"; isMut: true; isSigner: false },
        { name: "liquidationState"; isMut: true; isSigner: false },
        { name: "userInstrumentLongTokenVault"; isMut: true; isSigner: false },
        { name: "userInstrumentShortTokenVault"; isMut: true; isSigner: false },
        { name: "instrumentLongSplTokenMint"; isMut: true; isSigner: false },
        { name: "instrumentShortSplTokenMint"; isMut: true; isSigner: false },
        { name: "optifiMarket"; isMut: false; isSigner: false },
        { name: "serumMarket"; isMut: true; isSigner: false },
        { name: "openOrders"; isMut: true; isSigner: false },
        { name: "requestQueue"; isMut: true; isSigner: false },
        { name: "eventQueue"; isMut: true; isSigner: false },
        { name: "bids"; isMut: true; isSigner: false },
        { name: "asks"; isMut: true; isSigner: false },
        { name: "coinVault"; isMut: true; isSigner: false },
        { name: "pcVault"; isMut: true; isSigner: false },
        { name: "serumDexProgramId"; isMut: false; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false },
        { name: "pruneAuthority"; isMut: false; isSigner: false },
        { name: "vaultSigner"; isMut: false; isSigner: false },
        { name: "liquidator"; isMut: true; isSigner: true }
      ];
      args: [];
    },
    {
      name: "liquidationSettleOrder";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "userMarginAccount"; isMut: true; isSigner: false },
        { name: "liquidationState"; isMut: true; isSigner: false },
        { name: "userInstrumentLongTokenVault"; isMut: true; isSigner: false },
        { name: "userInstrumentShortTokenVault"; isMut: true; isSigner: false },
        { name: "optifiMarket"; isMut: true; isSigner: false },
        { name: "serumMarket"; isMut: true; isSigner: false },
        { name: "openOrders"; isMut: true; isSigner: false },
        { name: "coinVault"; isMut: true; isSigner: false },
        { name: "pcVault"; isMut: true; isSigner: false },
        { name: "vaultSigner"; isMut: false; isSigner: false },
        { name: "instrumentLongSplTokenMint"; isMut: true; isSigner: false },
        { name: "instrumentShortSplTokenMint"; isMut: true; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "serumDexProgramId"; isMut: false; isSigner: false },
        { name: "liquidator"; isMut: true; isSigner: true }
      ];
      args: [];
    },
    {
      name: "liquidationToAmm";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "marginStressAccount"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "userMarginAccount"; isMut: true; isSigner: false },
        { name: "liquidationState"; isMut: true; isSigner: false },
        { name: "userInstrumentLongTokenVault"; isMut: true; isSigner: false },
        { name: "userInstrumentShortTokenVault"; isMut: true; isSigner: false },
        { name: "optifiMarket"; isMut: false; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "liquidator"; isMut: true; isSigner: true },
        { name: "pcVault"; isMut: true; isSigner: false; docs: ['The vault for the "quote" currency'] },
        { name: "instrumentTokenMintAuthorityPda"; isMut: false; isSigner: false; docs: ["the mint authoriity of both long and short spl tokens"] },
        {
          name: "instrumentLongSplTokenMint";
          isMut: true;
          isSigner: false;
          docs: ['The token mint address of "base" currency, aka the instrument long spl token'];
        },
        { name: "instrumentShortSplTokenMint"; isMut: true; isSigner: false; docs: ["the instrument short spl token"] },
        { name: "ammInstrumentLongTokenVault"; isMut: true; isSigner: false },
        { name: "ammInstrumentShortTokenVault"; isMut: true; isSigner: false; docs: ["amm's instrument short spl token account"] },
        { name: "ammLiquidityAuth"; isMut: false; isSigner: false },
        { name: "amm"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "registerMarketMaker";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "marketMakerAccount"; isMut: true; isSigner: false },
        { name: "user"; isMut: true; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false }
      ];
      args: [{ name: "bump"; type: "u8" }];
    },
    {
      name: "mmPostOnlyOrder";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false; docs: ["optifi_exchange account"] },
        { name: "marginStressAccount"; isMut: false; isSigner: false },
        { name: "user"; isMut: false; isSigner: true; docs: ["the user's wallet"] },
        { name: "userAccount"; isMut: true; isSigner: false; docs: ["user's optifi account"] },
        { name: "marketMakerAccount"; isMut: true; isSigner: false },
        { name: "userMarginAccount"; isMut: true; isSigner: false; docs: ["user's margin account which is controlled by a pda"] },
        {
          name: "userInstrumentLongTokenVault";
          isMut: true;
          isSigner: false;
          docs: [
            "user's instrument long spl token account which is controlled by a the user's user account(pda)",
            "it stands for how many contracts the user sold for the instrument",
            "and it should be the same as order_payer_token_account if the order is ask order"
          ];
        },
        {
          name: "userInstrumentShortTokenVault";
          isMut: true;
          isSigner: false;
          docs: [
            "user's instrument short spl token account which is controlled by a the user's user account(pda)",
            "it stands for how many contracts the user bought for the instrument"
          ];
        },
        {
          name: "optifiMarket";
          isMut: false;
          isSigner: false;
          docs: ["optifi market that binds an instrument with a serum market(orderbook)", "it's also the mint authority of the instrument spl token"];
        },
        { name: "serumMarket"; isMut: true; isSigner: false; docs: ["the serum market(orderbook)"] },
        { name: "openOrders"; isMut: true; isSigner: false; docs: ["the user's open orders account"] },
        { name: "requestQueue"; isMut: true; isSigner: false },
        { name: "eventQueue"; isMut: true; isSigner: false },
        { name: "bids"; isMut: true; isSigner: false },
        { name: "asks"; isMut: true; isSigner: false },
        { name: "coinMint"; isMut: true; isSigner: false; docs: ['The token mint address of "base" currency, aka the instrument long spl token'] },
        { name: "coinVault"; isMut: true; isSigner: false; docs: ['The vault for the "base" currency'] },
        { name: "pcVault"; isMut: true; isSigner: false; docs: ['The vault for the "quote" currency'] },
        { name: "vaultSigner"; isMut: false; isSigner: false; docs: ["serum market vault owner (pda)"] },
        { name: "instrumentTokenMintAuthorityPda"; isMut: false; isSigner: false; docs: ["the mint authoriity of both long and short spl tokens"] },
        { name: "instrumentShortSplTokenMint"; isMut: true; isSigner: false; docs: ["the instrument short spl token"] },
        { name: "consumeEventsAuthority"; isMut: false; isSigner: false },
        { name: "serumDexProgramId"; isMut: false; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "rent"; isMut: false; isSigner: false }
      ];
      args: [
        { name: "side"; type: { defined: "OrderSide" } },
        { name: "limit"; type: "u64" },
        { name: "maxCoinQty"; type: "u64" },
        { name: "maxPcQty"; type: "u64" }
      ];
    },
    {
      name: "mmCalculation";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "marginStressAccount"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "userMarginAccount"; isMut: true; isSigner: false },
        { name: "marketMakerAccount"; isMut: true; isSigner: false },
        { name: "optifiMarket"; isMut: true; isSigner: false },
        { name: "serumMarket"; isMut: true; isSigner: false },
        { name: "openOrders"; isMut: true; isSigner: false },
        { name: "userInstrumentLongTokenVault"; isMut: true; isSigner: false },
        { name: "bids"; isMut: true; isSigner: false },
        { name: "asks"; isMut: true; isSigner: false },
        { name: "serumDexProgramId"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "mmCancelOrder";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false; docs: ["optifi_exchange account"] },
        { name: "user"; isMut: false; isSigner: true; docs: ["the user's wallet"] },
        { name: "userAccount"; isMut: true; isSigner: false; docs: ["user's optifi account"] },
        { name: "marketMakerAccount"; isMut: true; isSigner: false },
        { name: "userMarginAccount"; isMut: true; isSigner: false; docs: ["user's margin account which is controlled by a pda"] },
        {
          name: "userInstrumentLongTokenVault";
          isMut: true;
          isSigner: false;
          docs: [
            "user's instrument long spl token account which is controlled by a the user's user account(pda)",
            "it stands for how many contracts the user sold for the instrument",
            "and it should be the same as order_payer_token_account if the order is ask order"
          ];
        },
        {
          name: "userInstrumentShortTokenVault";
          isMut: true;
          isSigner: false;
          docs: [
            "user's instrument short spl token account which is controlled by a the user's user account(pda)",
            "it stands for how many contracts the user bought for the instrument"
          ];
        },
        {
          name: "optifiMarket";
          isMut: false;
          isSigner: false;
          docs: ["optifi market that binds an instrument with a serum market(orderbook)", "it's also the mint authority of the instrument spl token"];
        },
        { name: "serumMarket"; isMut: true; isSigner: false; docs: ["the serum market(orderbook)"] },
        { name: "openOrders"; isMut: true; isSigner: false; docs: ["the user's open orders account"] },
        { name: "requestQueue"; isMut: true; isSigner: false },
        { name: "eventQueue"; isMut: true; isSigner: false },
        { name: "bids"; isMut: true; isSigner: false },
        { name: "asks"; isMut: true; isSigner: false },
        { name: "coinMint"; isMut: true; isSigner: false; docs: ['The token mint address of "base" currency, aka the instrument long spl token'] },
        { name: "coinVault"; isMut: true; isSigner: false; docs: ['The vault for the "base" currency'] },
        { name: "pcVault"; isMut: true; isSigner: false; docs: ['The vault for the "quote" currency'] },
        { name: "vaultSigner"; isMut: false; isSigner: false; docs: ["serum market vault owner (pda)"] },
        { name: "instrumentShortSplTokenMint"; isMut: true; isSigner: false },
        { name: "pruneAuthority"; isMut: false; isSigner: false },
        { name: "serumDexProgramId"; isMut: false; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "mmSettlePenaltyReward";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "userMarginAccount"; isMut: true; isSigner: false },
        { name: "marketMakerAccount"; isMut: true; isSigner: false },
        { name: "usdcFeePool"; isMut: true; isSigner: false },
        { name: "centralUsdcPoolAuth"; isMut: false; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "scheduleMarketMakerWithdrawal";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "userMarginAccountUsdc"; isMut: true; isSigner: false; docs: ["user's margin account whose authority is user account(pda)"] },
        { name: "marketMakerAccount"; isMut: true; isSigner: false },
        { name: "user"; isMut: false; isSigner: true },
        { name: "clock"; isMut: false; isSigner: false }
      ];
      args: [{ name: "amount"; type: "u64" }];
    },
    {
      name: "executeMarketMakerWithdrawal";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: true; isSigner: false },
        { name: "userMarginAccountUsdc"; isMut: true; isSigner: false; docs: ["user's margin account whose authority is user account(pda)"] },
        { name: "withdrawDest"; isMut: false; isSigner: false },
        { name: "marketMakerAccount"; isMut: true; isSigner: false },
        { name: "user"; isMut: false; isSigner: true },
        { name: "tokenProgram"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "withdrawUsdcFeePool";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "usdcFeePool"; isMut: true; isSigner: false },
        { name: "centralUsdcPoolAuth"; isMut: false; isSigner: false },
        { name: "withdrawDest"; isMut: true; isSigner: false },
        { name: "authority"; isMut: false; isSigner: true },
        { name: "tokenProgram"; isMut: false; isSigner: false }
      ];
      args: [{ name: "amount"; type: "u64" }];
    },
    {
      name: "updateExchangeAuthority";
      accounts: [{ name: "optifiExchange"; isMut: true; isSigner: false }, { name: "authority"; isMut: false; isSigner: true }];
      args: [{ name: "newAuthority"; type: "publicKey" }];
    },
    {
      name: "updateOperationAuthority";
      accounts: [{ name: "optifiExchange"; isMut: true; isSigner: false }, { name: "authority"; isMut: false; isSigner: true }];
      args: [{ name: "newOperationAuthority"; type: "publicKey" }];
    },
    {
      name: "updateIvAuthority";
      accounts: [{ name: "optifiExchange"; isMut: true; isSigner: false }, { name: "authority"; isMut: false; isSigner: true }];
      args: [{ name: "newIvAuthority"; type: "publicKey" }];
    },
    {
      name: "updateOgNftMint";
      accounts: [{ name: "optifiExchange"; isMut: true; isSigner: false }, { name: "operationAuthority"; isMut: false; isSigner: true }];
      args: [{ name: "ogNftMint"; type: { option: "publicKey" } }];
    },
    {
      name: "updateUserDepositLimit";
      accounts: [{ name: "optifiExchange"; isMut: true; isSigner: false }, { name: "operationAuthority"; isMut: false; isSigner: true }];
      args: [{ name: "newAmount"; type: { option: "u64" } }];
    },
    {
      name: "updateOracle";
      accounts: [{ name: "optifiExchange"; isMut: true; isSigner: false }, { name: "operationAuthority"; isMut: false; isSigner: true }];
      args: [
        { name: "asset"; type: { defined: "Asset" } },
        { name: "spotOracle"; type: { option: "publicKey" } },
        { name: "ivOracle"; type: { option: "publicKey" } }
      ];
    },
    {
      name: "setDelegation";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: true; isSigner: false; docs: ["user account - also the pda that controls the user's spl token accounts"] },
        { name: "user"; isMut: false; isSigner: true; docs: ["The owner of user account"] }
      ];
      args: [{ name: "delegatee"; type: { option: "publicKey" } }];
    },
    {
      name: "initializeFeeAccount";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false; docs: ["the optifi_exchange account"] },
        { name: "userAccount"; isMut: true; isSigner: false; docs: ["the user's optifi account to be initialized"] },
        { name: "feeAccount"; isMut: true; isSigner: false; docs: ["the user's liquidation account to be initialized for liquidation use"] },
        { name: "payer"; isMut: true; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "addReferrer";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false; docs: ["the optifi_exchange account"] },
        { name: "userAccount"; isMut: false; isSigner: false; docs: ["the user's optifi account"] },
        { name: "feeAccount"; isMut: true; isSigner: false; docs: ["the user's fee_account"] },
        { name: "referrerUserAccount"; isMut: false; isSigner: false; docs: ["the referrer's user_account"] },
        { name: "referrerFeeAccount"; isMut: true; isSigner: false; docs: ["the referrer's fee_account"] },
        { name: "user"; isMut: true; isSigner: true }
      ];
      args: [{ name: "referrer"; type: "publicKey" }];
    },
    {
      name: "claimRebate";
      accounts: [
        { name: "optifiExchange"; isMut: false; isSigner: false; docs: ["the optifi_exchange account"] },
        { name: "userAccount"; isMut: false; isSigner: false; docs: ["the user's optifi account"] },
        { name: "userMarginAccount"; isMut: true; isSigner: false; docs: ["user's margin account which is controlled by a pda"] },
        { name: "user"; isMut: true; isSigner: true; docs: ["the referrer"] },
        { name: "feeAccount"; isMut: true; isSigner: false; docs: ["the user's fee_account"] },
        { name: "refereeFeeAccount"; isMut: true; isSigner: false; docs: ["the referee's fee_account"] },
        { name: "usdcFeePool"; isMut: true; isSigner: false },
        { name: "centralUsdcPoolAuth"; isMut: false; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "setUserFeeTier";
      accounts: [
        { name: "optifiExchange"; isMut: true; isSigner: false },
        { name: "operationAuthority"; isMut: false; isSigner: true },
        { name: "user"; isMut: false; isSigner: false },
        { name: "userAccount"; isMut: false; isSigner: false; docs: ["the user's optifi account"] },
        { name: "feeAccount"; isMut: true; isSigner: false; docs: ["the user's fee_account"] }
      ];
      args: [{ name: "feeTier"; type: { defined: "FeeTier" } }];
    }
  ];
  accounts: [
    {
      name: "ammAccount";
      type: {
        kind: "struct";
        fields: [
          { name: "optifiExchange"; docs: ["optifi exchange which the AMM belongs to"]; type: "publicKey" },
          { name: "ammIdx"; docs: ["index of the amm"]; type: "u8" },
          { name: "quoteTokenMint"; docs: ["quote token mint address"]; type: "publicKey" },
          { name: "quoteTokenVault"; docs: ["quote token account address"]; type: "publicKey" },
          { name: "lpTokenMint"; docs: ["LP tokens for liquidity providers"]; type: "publicKey" },
          { name: "ammCapacity"; type: "u64" },
          { name: "bump"; docs: ["bump seed used to derive this amm address"]; type: "u8" },
          { name: "asset"; docs: ["underlying asset"]; type: "u8" },
          { name: "tradingInstruments"; docs: ["a list of pubkeys of the instruments AMM will trade"]; type: { vec: "publicKey" } },
          { name: "positions"; docs: ["a list of Position struct by instruments"]; type: { vec: { defined: "Position" } } },
          { name: "proposals"; docs: ["a list of proposals of orders to excute for each instrument"]; type: { vec: { defined: "Proposal" } } },
          { name: "state"; docs: ["amm's state indicator"]; type: { defined: "AmmState" } },
          {
            name: "flags";
            docs: ["each instrument's state flag under the current AMM state", "the first flag is for future, while remaining flags for options"];
            type: { vec: "bool" };
          },
          { name: "iv"; docs: ["the implied volatility"]; type: "u64" },
          { name: "price"; docs: ["the underlying asset price denominated in USDC"]; type: "u64" },
          { name: "netDelta"; docs: ["the net delta denominated in underlying asset"]; type: "i64" },
          { name: "timestamp"; docs: ["the timestamp when lastest update"]; type: "u64" },
          { name: "totalLiquidityUsdc"; docs: ["the amm total liquidity denominated in USDC (with 6 decimals)"]; type: "u64" },
          { name: "duration"; docs: ["the duration type (Weekly/Monthly)"]; type: { defined: "Duration" } },
          { name: "expiryDate"; docs: ["the expiry date"]; type: "u64" },
          { name: "contractSize"; docs: ["the contract size *10000 (f_to_u_repr)"]; type: "u64" },
          { name: "clientOrderIdCounter"; docs: ["client order id counter for amm placing orders"]; type: "u64" },
          { name: "ammMangoAccount"; docs: ["amm's mango account for hedging on mango market"]; type: "publicKey" },
          { name: "isHedgeNeeded"; docs: ["is mango hedging needed"]; type: "bool" },
          { name: "isHedgeInProgress"; docs: ["is mango hedging in progress"]; type: "bool" },
          { name: "tempPnl"; docs: ["temp PnL record for fund settlment purpose"]; type: { defined: "TempPnL" } },
          { name: "withdrawQueue"; docs: ["pubkey of amm's withdraw queue"]; type: "publicKey" }
        ];
      };
    },
    {
      name: "ammWithdrawRequestQueue";
      type: {
        kind: "struct";
        fields: [
          { name: "requestIdCounter"; type: "u32" },
          { name: "head"; type: "u32" },
          { name: "tail"; type: "u32" },
          { name: "requests"; type: { array: [{ defined: "WithdrawRequest" }, 5000] } }
        ];
      };
    },
    {
      name: "chain";
      type: {
        kind: "struct";
        fields: [
          { name: "asset"; docs: ["underlying asset"]; type: "u8" },
          { name: "instrumentType"; docs: ["option or future"]; type: { defined: "InstrumentType" } },
          { name: "strike"; docs: ["strike price of the instrument"]; type: "u64" },
          { name: "expiryDate"; docs: ["expiry date of the instrument, unix timestamp"]; type: "u64" },
          { name: "duration"; docs: ["Duration type"]; type: { defined: "Duration" } },
          { name: "start"; docs: ["Start date, as a unix timestamp"]; type: "u64" },
          { name: "expiryType"; docs: ["Is this a perpetual contract? Only valid for futures"]; type: { defined: "ExpiryType" } },
          { name: "isListedOnMarket"; docs: ["Is the instrument listed on market for trading"]; type: "bool" },
          { name: "contractSize"; docs: ["contract size *10000 (f_to_u_repr)"]; type: "u64" }
        ];
      };
    },
    {
      name: "exchange";
      type: {
        kind: "struct";
        fields: [
          { name: "uuid"; docs: ["id of the OptiFi Exchange"]; type: "string" },
          { name: "version"; docs: ["OptiFi Exchange version"]; type: "u32" },
          { name: "exchangeAuthority"; docs: ["the authority address"]; type: "publicKey" },
          { name: "usdcMint"; docs: ["the recognized usdc token mint"]; type: "publicKey" },
          { name: "usdcCentralPool"; docs: ["usdc central pool for fund settlement"]; type: "publicKey" },
          { name: "usdcFeePool"; docs: ["usdc fee pool"]; type: "publicKey" },
          { name: "userAccountIdCounter"; docs: ["user account id counter"]; type: "u64" },
          { name: "oracle"; docs: ["oracle data by assets"]; type: { vec: { defined: "OracleData" } } },
          {
            name: "markets";
            docs: ["a list of all created optifi markets, it should be updated when new market is created"];
            type: { vec: { defined: "OptifiMarketKeyData" } };
          },
          { name: "instrumentCommon"; type: { vec: { defined: "InstrumentCommon" } } },
          { name: "instrumentUnique"; type: { vec: { vec: { defined: "InstrumentUnique" } } } },
          { name: "ogNftMint"; docs: ["pubkey of og nft mint. None means og nft mode is turned off"]; type: { option: "publicKey" } },
          { name: "userDepositLimit"; docs: ["user deposit limit"]; type: { option: "u64" } },
          { name: "operationAuthority"; docs: ["operation authority address"]; type: "publicKey" },
          { name: "ivAuthority"; docs: ["iv authority address"]; type: "publicKey" }
        ];
      };
    },
    {
      name: "feeAccount";
      type: {
        kind: "struct";
        fields: [
          { name: "userAccount"; type: "publicKey" },
          { name: "feeTier"; type: { defined: "FeeTier" } },
          { name: "notionalTradingVolume"; type: "u64" },
          { name: "accFee"; type: "u64" },
          { name: "referrer"; type: { option: "publicKey" } },
          { name: "accRebateFee"; type: "u64" },
          { name: "openOrderFee"; type: { vec: { defined: "FeeLog" } } }
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
          { name: "timestamp"; type: "u64" },
          { name: "markets"; type: { vec: "publicKey" } },
          { name: "values"; type: { vec: "i64" } }
        ];
      };
    },
    {
      name: "marginStressAccount";
      type: {
        kind: "struct";
        fields: [
          { name: "optifiExchange"; docs: ["optifi exchange which the MarginStress belongs to"]; type: "publicKey" },
          { name: "bump"; docs: ["bump seed used to derive this MarginStress address"]; type: "u8" },
          { name: "asset"; docs: ["underlying asset"]; type: { defined: "Asset" } },
          { name: "spotPrice"; type: "u64" },
          { name: "iv"; type: "u64" },
          { name: "timestamp"; type: "u64" },
          { name: "timestampIv"; type: "u64" },
          { name: "state"; docs: ["Deprecated: MarginStress's state indicator"]; type: { defined: "MarginStressState" } },
          { name: "flags"; docs: ["Deprecated: each instrument's state flag under the current MarginStress state"]; type: { vec: "bool" } },
          { name: "instruments"; docs: ["a list of pubkeys of the instruments"]; type: { vec: "publicKey" } },
          { name: "strikes"; type: { vec: "u64" } },
          { name: "isCall"; type: "bytes" },
          { name: "expiryDate"; type: { vec: "u64" } },
          { name: "optionPrice"; type: { vec: "u64" } },
          { name: "intrinsicValue"; type: { vec: "u64" } },
          { name: "optionPriceDeltaInStressPrice"; type: { vec: { vec: "i64" } } }
        ];
      };
    },
    {
      name: "marketMakerAccount";
      type: {
        kind: "struct";
        fields: [
          { name: "userAccount"; docs: ["The user that this market maker is associated with"]; type: "publicKey" },
          { name: "active"; type: "bool" },
          {
            name: "withdrawTs";
            docs: [
              "This is used for the market maker 24 hour withdrawl window - if this is 0, then",
              "there's no withdrawal currently registered. If it's not 0, it's the timestamp at which",
              "a withdrawal was started"
            ];
            type: "u64";
          },
          { name: "withdrawalAmount"; type: "u64" },
          { name: "openOrdersData"; type: { vec: { defined: "OpenOrdersData" } } }
        ];
      };
    },
    {
      name: "optifiMarket";
      type: {
        kind: "struct";
        fields: [
          { name: "optifiMarketId"; docs: ["id of the optifi market, we may have markets with id from 1 ~ 50"]; type: "u16" },
          { name: "serumMarket"; docs: ["the serum orderbook market which is used to swap instrument spl token and quote token"]; type: "publicKey" },
          { name: "instrument"; docs: ["the instrument which is listed on this market"]; type: "publicKey" },
          { name: "instrumentLongSplToken"; docs: ["instrumnet long spl token which would be sent to instrument buyers"]; type: "publicKey" },
          { name: "instrumentShortSplToken"; docs: ["instrumnet short spl token which would be minted to instrument seller"]; type: "publicKey" },
          { name: "isStopped"; docs: ["whether the optitfi market is stopped, which may be updated when the listing instruments is expired"]; type: "bool" },
          { name: "bump"; docs: ["bump seed which is used to generate this optifi market address"]; type: "u8" },
          { name: "settlePrice"; docs: ["settle price in expired (in f_to_u_repr)"]; type: { option: "u64" } }
        ];
      };
    },
    {
      name: "userAccount";
      type: {
        kind: "struct";
        fields: [
          { name: "optifiExchange"; docs: ["optifi exchange which the user account belongs to"]; type: "publicKey" },
          { name: "owner"; docs: ["The owner of this account."]; type: "publicKey" },
          { name: "id"; docs: ["user account id"]; type: "u64" },
          { name: "userMarginAccountUsdc"; docs: ["The margin account which user deposits usdc token into", "it's a spl token account"]; type: "publicKey" },
          { name: "tempPnl"; docs: ["temp PnL record for fund settlment purpose"]; type: { defined: "TempPnL" } },
          { name: "state"; docs: ["The account's state"]; type: { defined: "AccountState" } },
          { name: "positions"; docs: ["a list of instrument Pubkey and position"]; type: { vec: { defined: "UserPosition" } } },
          { name: "isInLiquidation"; type: "bool" },
          { name: "isMarketMaker"; type: "bool" },
          { name: "bump"; docs: ["the bump seed to get the address of this user account"]; type: "u8" },
          { name: "amountToReserve"; docs: ["margin requirement"]; type: { array: ["u64", 10] } },
          { name: "netOptionValue"; type: { array: ["i64", 10] } },
          { name: "tradingMarkets"; docs: ["user's trading markets"]; type: { vec: "publicKey" } },
          { name: "liquidateFlags"; docs: ["flags for liquidation use"]; type: { vec: "bool" } },
          { name: "clientOrderIdCounter"; type: "u64" },
          { name: "ammEquities"; docs: ["user's equity for on each amm"]; type: { array: [{ defined: "UserAmmEquity" }, 20] } },
          { name: "fee"; docs: ["the accumulated fee which user has paid (f_to_u)"]; type: "u64" },
          { name: "tradingValue"; docs: ["the accumulated trading volume in USDC (f_to_u)"]; type: "u64" },
          { name: "totalDeposit"; docs: ["user's total deposit"]; type: "u64" },
          { name: "delegatee"; docs: ["the delegatee of this account."]; type: { option: "publicKey" } },
          { name: "feeAccount"; type: "publicKey" }
        ];
      };
    }
  ];
  types: [
    { name: "OptionData"; type: { kind: "struct"; fields: [{ name: "size"; type: "i32" }] } },
    {
      name: "StressFunctionResult";
      docs: ["stress function result"];
      type: {
        kind: "struct";
        fields: [
          { name: "price"; type: { vec: { vec: "f64" } } },
          { name: "intrinsicValue"; type: { vec: { vec: "f64" } } },
          { name: "stressPriceDelta"; type: { vec: { vec: "f64" } } }
        ];
      };
    },
    {
      name: "MarginFunctionResult";
      docs: ["margin function result"];
      type: {
        kind: "struct";
        fields: [
          { name: "netQty"; type: "i64" },
          { name: "notionalQty"; type: "i64" },
          { name: "net"; type: "f64" },
          { name: "notional"; type: "f64" },
          { name: "stressResult"; type: "f64" },
          { name: "netIntrinsic"; type: "f64" },
          { name: "netPremium"; type: "f64" },
          { name: "maturingNetIntrinsic"; type: "f64" },
          { name: "maturingPremium"; type: "f64" },
          { name: "maturingLiquidity"; type: "f64" },
          { name: "totalMargin"; type: "f64" },
          { name: "netLeverage"; type: "f64" },
          { name: "notionalLeverage"; type: "f64" }
        ];
      };
    },
    {
      name: "InitializeAMMData";
      type: {
        kind: "struct";
        fields: [
          { name: "ammIdx"; docs: ["idx of the amm"]; type: "u8" },
          { name: "ammCapacity"; docs: ["amm capacity percentage (25 is actually 25%)"]; type: "u64" },
          { name: "bump"; docs: ["bump seed used to derive this amm address"]; type: "u8" },
          { name: "asset"; docs: ["underlying asset"]; type: "u8" },
          { name: "numInstruments"; docs: ["number of trading instruments"]; type: "u8" },
          { name: "duration"; docs: ["Duration type"]; type: "u8" },
          { name: "contractSize"; docs: ["the contract size *10^6 (f_to_u_repr)"]; type: "u64" }
        ];
      };
    },
    {
      name: "InitializeExchangeData";
      type: {
        kind: "struct";
        fields: [
          { name: "uuid"; docs: ["id of the OptiFi Exchange"]; type: "string" },
          { name: "version"; docs: ["OptiFi Exchange version"]; type: "u32" },
          { name: "exchangeAuthority"; docs: ["the authority address"]; type: "publicKey" },
          { name: "usdcMint"; docs: ["the recognized usdc token mint"]; type: "publicKey" },
          { name: "ogNftMint"; docs: ["pubkey of og nft mint. None means og nft mode is turned off"]; type: { option: "publicKey" } },
          { name: "userDepositLimit"; docs: ["user deposit limit"]; type: { option: "u64" } },
          { name: "operationAuthority"; type: "publicKey" },
          { name: "ivAuthority"; type: "publicKey" }
        ];
      };
    },
    {
      name: "ChainData";
      type: {
        kind: "struct";
        fields: [
          { name: "asset"; docs: ["underlying asset"]; type: "u8" },
          { name: "instrumentType"; docs: ["option or future"]; type: "u8" },
          { name: "expiryDate"; docs: ["expiry date of the instrument, unix timestamp"]; type: "u64" },
          { name: "duration"; docs: ["Duration type"]; type: "u8" },
          { name: "start"; docs: ["Start date, as a unix timestamp"]; type: "u64" },
          { name: "expiryType"; docs: ["Is this a perpetual contract? Only valid for futures"]; type: "u8" },
          { name: "contractSize"; docs: ["contract size percentage: 1 means actually 0.01"]; type: "u64" },
          { name: "instrumentIdx"; type: "u8" }
        ];
      };
    },
    { name: "InitUserAccountBumpSeeds"; type: { kind: "struct"; fields: [{ name: "userAccount"; type: "u8" }, { name: "liquidationAccount"; type: "u8" }] } },
    {
      name: "Proposal";
      type: {
        kind: "struct";
        fields: [
          { name: "instrument"; docs: ["instrument pubkey"]; type: "publicKey" },
          { name: "isStarted"; docs: ["if the orders execution is started"]; type: "bool" },
          { name: "askOrdersSize"; docs: ["all ask_orders_size"]; type: { vec: "u64" } },
          { name: "bidOrdersSize"; docs: ["all orders to execute"]; type: { vec: "u64" } },
          { name: "askOrdersPrice"; docs: ["all orders to execute"]; type: { vec: "u64" } },
          { name: "bidOrdersPrice"; docs: ["all orders to execute"]; type: { vec: "u64" } },
          { name: "askClientOrderIds"; docs: ["ask order ids of last round"]; type: { vec: "u64" } },
          { name: "bidClientOrderIds"; docs: ["bid order ids of last round"]; type: { vec: "u64" } },
          { name: "prevAskOrdersPrice"; docs: ["ask order prices of last round"]; type: { vec: "u64" } },
          { name: "prevBidOrdersPrice"; docs: ["bid order prices of last round"]; type: { vec: "u64" } }
        ];
      };
    },
    {
      name: "Position";
      type: {
        kind: "struct";
        fields: [
          { name: "instruments"; docs: ["the instrument of the positions"]; type: "publicKey" },
          { name: "longTokenVault"; docs: ["base token account address"]; type: "publicKey" },
          { name: "shortTokenVault"; docs: ["base token account address"]; type: "publicKey" },
          { name: "latestPosition"; docs: ["latest position updated by update_amm_positions"]; type: "i64" },
          { name: "usdcBalance"; docs: ["the usdc remains in the vault"]; type: "u64" }
        ];
      };
    },
    {
      name: "WithdrawRequest";
      type: {
        kind: "struct";
        fields: [
          { name: "requestId"; docs: ["request id"]; type: "u32" },
          { name: "userAccountId"; docs: ["id of user account"]; type: "u32" },
          { name: "amount"; docs: ["lp token amount to withdraw"]; type: "u64" },
          { name: "requestTimestamp"; docs: ["the timestamp when the request is received"]; type: "u64" }
        ];
      };
    },
    {
      name: "OracleData";
      docs: ["only keep the key data for a created Instrument"];
      type: {
        kind: "struct";
        fields: [
          { name: "asset"; type: { defined: "Asset" } },
          { name: "spotOracle"; docs: ["trusted oracle account for sopt price"]; type: { option: "publicKey" } },
          { name: "ivOracle"; docs: ["trusted oracle account for iv"]; type: { option: "publicKey" } }
        ];
      };
    },
    {
      name: "InstrumentCommon";
      docs: ["keep the common data for an instrument group"];
      type: {
        kind: "struct";
        fields: [
          { name: "asset"; docs: ["underlying asset"]; type: { defined: "Asset" } },
          { name: "expiryDate"; docs: ["expiry date of the instrument, unix timestamp"]; type: "u64" },
          { name: "expiryType"; type: { defined: "ExpiryType" } }
        ];
      };
    },
    {
      name: "InstrumentUnique";
      docs: ["keep the unique data for an instrument"];
      type: {
        kind: "struct";
        fields: [
          { name: "strike"; docs: ["strike price of the instrument"]; type: "u32" },
          { name: "instrumentPubkeys"; docs: ["instrument pubkey (0: put 1: call)"]; type: { array: ["publicKey", 2] } }
        ];
      };
    },
    {
      name: "OptifiMarketKeyData";
      docs: ["only keep the key data for a created OptiFi Market"];
      type: {
        kind: "struct";
        fields: [
          { name: "optifiMarketPubkey"; docs: ["pubkey of created optifi market"]; type: "publicKey" },
          { name: "expiryDate"; docs: ["expiry date of the instrument which is listed on this market"]; type: "u64" },
          { name: "isStopped"; docs: ["whether the optitfi market is stopped, which may be updated when the listing instruments is expired"]; type: "bool" }
        ];
      };
    },
    {
      name: "FeeLog";
      type: {
        kind: "struct";
        fields: [{ name: "maxCoinQty"; type: "u64" }, { name: "fee"; type: "u64" }, { name: "clientOrderId"; type: "u64" }, { name: "spotPrice"; type: "u64" }];
      };
    },
    {
      name: "OpenOrdersData";
      type: {
        kind: "struct";
        fields: [
          { name: "market"; type: "publicKey" },
          { name: "timestamp"; type: "u64" },
          { name: "bids"; type: { vec: { defined: "Order" } } },
          { name: "asks"; type: { vec: { defined: "Order" } } },
          { name: "ask1"; type: "u64" },
          { name: "bid1"; type: "u64" },
          { name: "spotPrice"; type: "u64" },
          { name: "delta"; type: "i64" },
          { name: "margin"; type: "u64" },
          { name: "position"; type: "i64" },
          { name: "state"; type: { defined: "MmState" } },
          { name: "volume"; type: "u64" },
          { name: "totalIndicator"; type: "u64" },
          { name: "timeWeightedIndicator"; type: "u64" },
          { name: "dailyVolume"; type: "u64" },
          { name: "penalty"; type: "u64" },
          { name: "askReward"; type: "u64" },
          { name: "bidReward"; type: "u64" }
        ];
      };
    },
    {
      name: "Order";
      type: { kind: "struct"; fields: [{ name: "price"; type: "u64" }, { name: "size"; type: "u64" }, { name: "clientOrderId"; type: "u64" }] };
    },
    {
      name: "UserPosition";
      type: { kind: "struct"; fields: [{ name: "instrument"; type: "publicKey" }, { name: "longQty"; type: "u64" }, { name: "shortQty"; type: "u64" }] };
    },
    { name: "TempPnL"; type: { kind: "struct"; fields: [{ name: "amount"; type: "i64" }, { name: "epoch"; type: "u64" }] } },
    { name: "UserAmmEquity"; type: { kind: "struct"; fields: [{ name: "notionalWithdrawable"; type: "u64" }, { name: "lpAmountInQueue"; type: "u64" }] } },
    { name: "Asset"; type: { kind: "enum"; variants: [{ name: "Bitcoin" }, { name: "Ethereum" }, { name: "USDC" }, { name: "Solana" }] } },
    { name: "InstrumentType"; type: { kind: "enum"; variants: [{ name: "Put" }, { name: "Call" }] } },
    { name: "ExpiryType"; type: { kind: "enum"; variants: [{ name: "Standard" }, { name: "Perpetual" }] } },
    { name: "InstrumentData"; type: { kind: "enum"; variants: [] } },
    { name: "InstrumentExpiryType"; type: { kind: "enum"; variants: [{ name: "Standard" }, { name: "Perpetual" }] } },
    {
      name: "SpotInputOption";
      docs: ["For constructing the spot input for fn d1() and fn d2()", "It provids two options: one for single spot, one for array of spot", ""];
      type: { kind: "enum"; variants: [{ name: "SingleSpot"; fields: ["f64"] }, { name: "MultiSpots"; fields: [{ vec: { vec: "f64" } }] }] };
    },
    { name: "OrderSide"; type: { kind: "enum"; variants: [{ name: "Bid" }, { name: "Ask" }] } },
    {
      name: "AmmState";
      docs: [
        "1. When AMM state is Sync. a syncing cranker finds instrument with false flag to sync positions.",
        "If all flag are true, AMM state will change to Calculate, and flags will be reset to all false.",
        "2. When AMM state is Calculate, a calculating crankers instrument finds instrument with false to calc",
        "and save the proposal, and set this instrument's flag to true.",
        "If all flags are true, AMM state will change to Execute, and flags will be reset to all false.",
        "3. When AMM state is Execute, the first executing cranker find those instuments with false flags to",
        "execute the orders in proposal.",
        "In a propsal, if the flag is_started is false, so the cranker, as the first cranker will need",
        "to cancel the previous orders of this instrumnet, and then submit some orders in orders_to_execute of the proposal.",
        "If the length of orders_to_execute is 0, which means the proposal is finished. so the cranker will",
        "set instrument's flag in AMM as true.",
        "If all flags in AMM are true, the executing cranker will change AMM state into Sync and",
        "reset all flags in AMM to false, which means next round of AMM update can be started."
      ];
      type: { kind: "enum"; variants: [{ name: "Sync" }, { name: "CalculateDelta" }, { name: "CalculateProposal" }, { name: "Execute" }] };
    },
    { name: "Duration"; type: { kind: "enum"; variants: [{ name: "Weekly" }, { name: "Monthly" }] } },
    { name: "FeeTier"; type: { kind: "enum"; variants: [{ name: "Level1" }, { name: "Level2" }, { name: "Level3" }, { name: "Level4" }, { name: "Level5" }] } },
    {
      name: "LiquidationStatus";
      type: { kind: "enum"; variants: [{ name: "Healthy" }, { name: "CancelOrder" }, { name: "PlaceOrder" }, { name: "SettleOrder" }] };
    },
    { name: "MarginStressState"; type: { kind: "enum"; variants: [{ name: "Sync" }, { name: "Calculate" }, { name: "Available" }] } },
    { name: "MmState"; type: { kind: "enum"; variants: [{ name: "Calculation" }, { name: "Available" }] } },
    {
      name: "AccountState";
      docs: ["Account state."];
      type: { kind: "enum"; variants: [{ name: "Uninitialized" }, { name: "Initialized" }, { name: "Frozen" }] };
    },
    { name: "OracleDataType"; docs: ["Oracle data type"]; type: { kind: "enum"; variants: [{ name: "Spot" }, { name: "IV" }] } }
  ];
  errors: [
    { code: 6000; name: "AccountCannotInit"; msg: "the user account cannot be initialized" },
    { code: 6001; name: "InvalidAccount"; msg: "the user account is invalid" },
    { code: 6002; name: "InvalidMarginAccount"; msg: "the margin account is invalid" },
    { code: 6003; name: "UnauthorizedAccount"; msg: "the account is not owned by the payer" },
    { code: 6004; name: "InsufficientFund"; msg: "the account balance is insufficient" },
    { code: 6005; name: "TokenTransferFailed"; msg: "Token transfer failed" },
    { code: 6006; name: "UnauthorizedTokenVault"; msg: "the token vault is not owned by the payer" },
    { code: 6007; name: "InvalidPDA"; msg: "the provided pda is invalid" },
    { code: 6008; name: "UuidMustBeExactly6Length"; msg: "Uuid must be exactly of 6 length" },
    { code: 6009; name: "NumericalOverflowError"; msg: "Numerical overflow error!" },
    { code: 6010; name: "InsufficientMargin"; msg: "Insufficient Margin!" },
    { code: 6011; name: "IncorrectCoinMint"; msg: "Incorrect coin mint!" },
    { code: 6012; name: "CannotRecordPnLBeforeMarketsExpired"; msg: "Cannot record pnl befor markets is expired!" },
    { code: 6013; name: "CannotSettleFundBeforeMarketsStopped"; msg: "Cannot settle fund befor markets has been stopped!" },
    { code: 6014; name: "CannotRecordPnLForStoppedMarket"; msg: "Cannot record pnl when market is stopped!" },
    { code: 6015; name: "InstrumetIsDelisted"; msg: "Cannot record pnl for delisted instrument!" },
    { code: 6016; name: "IncorrectOracleAccount"; msg: "Incorrect oracle account" },
    { code: 6017; name: "WrongState"; msg: "the working state is wrong" },
    { code: 6018; name: "WrongInstrument"; msg: "the instrument has already been done" },
    { code: 6019; name: "NoEnoughOrdersInProposal"; msg: "no enough orders in proposal to execute" },
    { code: 6020; name: "CannotRemoveInstrumentForAMM"; msg: "cannot remove the instrument for amm" },
    { code: 6021; name: "DuplicateInstrumentForAMM"; msg: "cannot add the instrument for amm due to duplication" },
    { code: 6022; name: "UserNotInLiquidation"; msg: "User is not in liquidation" },
    { code: 6023; name: "UserNotInCancelOrder"; msg: "User is not in cancel order status" },
    { code: 6024; name: "UserAlreadyInLiquidation"; msg: "User was already in liquidation" },
    { code: 6025; name: "InstrumentAlreadyRegisteredForLiquidation"; msg: "Instrument was already registered for liquidation" },
    { code: 6026; name: "CannotPlaceOrdersInLiquidation"; msg: "Users cannot place manual orders while their accounts are in liquidation" },
    { code: 6027; name: "CannotCancelOrdersInLiquidation"; msg: "Users cannot cancel manual orders while their accounts are in liquidation" },
    { code: 6028; name: "PoolNotCentralUSDCPool"; msg: "Provided USDC pool is not central pool" },
    { code: 6029; name: "InvalidSerumAuthority"; msg: "Invalid open orders market authority" },
    { code: 6030; name: "WithdrawRequestInvalid"; msg: "Only one withdraw request allowed at one time" },
    { code: 6031; name: "UserIsMarketMaker"; msg: "User is already registered as market maker" },
    { code: 6032; name: "MMWithdrawNotInWindow"; msg: "Market maker withdraw outside of valid window" },
    { code: 6033; name: "WrongAsset"; msg: "Wrong asset" },
    { code: 6034; name: "TimeOut"; msg: "Should update the margin stress again" },
    { code: 6035; name: "OrderFailed"; msg: "The order is failed" },
    { code: 6036; name: "WrongFeeAccount"; msg: "Wrong USDC fee account" },
    { code: 6037; name: "InvalidMangoAccount"; msg: "the mango account is invalid" },
    { code: 6038; name: "InvalidMangoToken"; msg: "the mango token index is invalid" },
    { code: 6039; name: "IncorrectOpenOrdersAccountsLength"; msg: "the length of open orders accounts is incorrect" },
    { code: 6040; name: "WrongPerpMarketIndex"; msg: "wrong perp market index" },
    { code: 6041; name: "MismatchedAsset"; msg: "asset of amm and the instrument are mismatched" },
    { code: 6042; name: "InstrumentExpired"; msg: "the instrument is expired" },
    { code: 6043; name: "MismatchedDuration"; msg: "duration of amm and the instrument are mismatched" },
    { code: 6044; name: "DontNeedGenerateNextInstrument"; msg: "spot price is in strike interval" },
    { code: 6045; name: "InsufficientWithdrawableLPAmount"; msg: "insufficient withdrawable lp token amount" },
    { code: 6046; name: "WithdrawRequestQueueIsFull"; msg: "withdraw request queue is full" },
    { code: 6047; name: "WithdrawRequestQueueIsEmpty"; msg: "no withdraw request to process" },
    { code: 6048; name: "MismatchedWithdrawUserId"; msg: "mismatched withdraw request user id" },
    { code: 6049; name: "AmmWithdrawNotInWindow"; msg: "amm withdraw not in correct time window" },
    { code: 6050; name: "WithdrawWouldBreachAmmDelta"; msg: "withdrawal would breach amm delta" },
    { code: 6051; name: "NoOGNftFound"; msg: "No OG NFT found" },
    { code: 6052; name: "InvalidOGNftVault"; msg: "Invalid OG NFT vault" },
    { code: 6053; name: "InvalidOGNftMint"; msg: "Invalid OG NFT mint" },
    { code: 6054; name: "UnauthorizedOperation"; msg: "unauthorized operation" },
    { code: 6055; name: "InsufficientAmmCapacity"; msg: "amm trading capacity is not enough" },
    { code: 6056; name: "CannotDepositMoreThanLimit"; msg: "cannot deposit more than the deposit limit" },
    { code: 6057; name: "MismatchedInstrument"; msg: "Instrument index is wrong" },
    { code: 6058; name: "InvalidMarginStressAccount"; msg: "Invalid margin stress account" }
  ];
  metadata: { address: "opDV2tLVsRPGk9aYqm4gdtGotiRwjuYKUmWzWB7NfCR" };
};
import { IdlAccounts } from "@project-serum/anchor";

export type Asset = Record<string, Record<string, any>>;
export const Asset = {
  Bitcoin: { bitcoin: {} },
  Ethereum: { ethereum: {} },
  USDC: { usdc: {} },
  Solana: { solana: {} },
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

export type SpotInputOption = Record<string, Record<string, any>>;
export const SpotInputOption = {
  SingleSpot: { singlespot: {} },
  MultiSpots: { multispots: {} },
};

export type OrderSide = Record<string, Record<string, any>>;
export const OrderSide = {
  Bid: { bid: {} },
  Ask: { ask: {} },
};

export type AmmState = Record<string, Record<string, any>>;
export const AmmState = {
  Sync: { sync: {} },
  CalculateDelta: { calculatedelta: {} },
  CalculateProposal: { calculateproposal: {} },
  Execute: { execute: {} },
};

export type Duration = Record<string, Record<string, any>>;
export const Duration = {
  Weekly: { weekly: {} },
  Monthly: { monthly: {} },
};

export type FeeTier = Record<string, Record<string, any>>;
export const FeeTier = {
  Level1: { level1: {} },
  Level2: { level2: {} },
  Level3: { level3: {} },
  Level4: { level4: {} },
  Level5: { level5: {} },
};

export type LiquidationStatus = Record<string, Record<string, any>>;
export const LiquidationStatus = {
  Healthy: { healthy: {} },
  CancelOrder: { cancelorder: {} },
  PlaceOrder: { placeorder: {} },
  SettleOrder: { settleorder: {} },
};

export type MarginStressState = Record<string, Record<string, any>>;
export const MarginStressState = {
  Sync: { sync: {} },
  Calculate: { calculate: {} },
  Available: { available: {} },
};

export type MmState = Record<string, Record<string, any>>;
export const MmState = {
  Calculation: { calculation: {} },
  Available: { available: {} },
};

export type AccountState = Record<string, Record<string, any>>;
export const AccountState = {
  Uninitialized: { uninitialized: {} },
  Initialized: { initialized: {} },
  Frozen: { frozen: {} },
};

export type OracleDataType = Record<string, Record<string, any>>;
export const OracleDataType = {
  Spot: { spot: {} },
  IV: { iv: {} },
};

export type AmmAccount = IdlAccounts<OptifiExchangeIDL>["ammAccount"];

export type AmmWithdrawRequestQueue = IdlAccounts<OptifiExchangeIDL>["ammWithdrawRequestQueue"];

export type Chain = IdlAccounts<OptifiExchangeIDL>["chain"];

export type Exchange = IdlAccounts<OptifiExchangeIDL>["exchange"];

export type FeeAccount = IdlAccounts<OptifiExchangeIDL>["feeAccount"];

export type LiquidationState = IdlAccounts<OptifiExchangeIDL>["liquidationState"];

export type MarginStressAccount = IdlAccounts<OptifiExchangeIDL>["marginStressAccount"];

export type MarketMakerAccount = IdlAccounts<OptifiExchangeIDL>["marketMakerAccount"];

export type OptifiMarket = IdlAccounts<OptifiExchangeIDL>["optifiMarket"];

export type UserAccount = IdlAccounts<OptifiExchangeIDL>["userAccount"];
