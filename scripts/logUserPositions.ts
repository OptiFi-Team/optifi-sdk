import { initializeContext } from "../index";
import { findOptifiMarkets, findOptifiMarketsWithFullData, getPosition, getUserPositions, isUserInitializedOnMarket } from "../utils/market";
import { findOrCreateAssociatedTokenAccount } from "../utils/token";
import { findUserAccount } from "../utils/accounts";
import { UserAccount } from "../types/optifi-exchange-types";
import UserPosition from "../types/user";
import { calcPnLForUserPositions } from "../utils/user";
import { getAllTradesForAccount, getFilterTradesForAccount } from "../utils/tradeHistory";
import { Connection, Keypair, PublicKey, ConnectionConfig, Commitment } from "@solana/web3.js";
import Decimal from "decimal.js";
initializeContext(undefined, undefined, undefined, undefined, undefined, { commitment: "confirmed" }).then(async (context) => {
    // findUserAccount(context).then(([userAccountAddress, _]) => {
    // findOptifiMarkets(context).then(async (markets) => {
    //     let res = await context.program.account.userAccount.fetch(userAccountAddress);
    //     // @ts-ignore
    //     let userAccount = res as UserAccount;
    //     let positions = userAccount.positions as UserPosition[];
    //     let tradingMarkets = markets.filter(market => positions.map(e => e.toString()).includes(market[0].instrument.toString()));
    //     console.log(positions);
    //     Promise.all(
    //         tradingMarkets.map(async (market) => {
    //             let [longAmount, shortAmount] = await getPosition(context,
    //                 market[0],
    //                 userAccountAddress,
    //             );
    //             console.log(`market: ${market[1]}\n`);
    //             console.log(`long tokens: ${longAmount}\n`);
    //             console.log(`short tokens: ${shortAmount}\n`);
    //         })
    //     )
    // }).catch((err) => console.log(err))
    // })


    let [userAccountAddress, _] = await findUserAccount(context)
    // prepare user positions
    let userPositions = await getUserPositions(context, userAccountAddress)
    console.log("userPositions: ", userPositions)

    // prepare market prices
    let marketsInfos = await findOptifiMarketsWithFullData(context)
    let marketPrices: number[] = []
    userPositions.forEach(position => {
        let market = marketsInfos.find(market => market.marketAddress.toString() == position.marketId.toString())!
        let price = (position.positionType == "long") ? market.bidPrice : market.askPrice;
        marketPrices.push(price)
    })

    // prepare trade history
    // let userTradesHistory = await getAllTradesForAccount(context, userAccountAddress)
    let userTradesHistory = await getFilterTradesForAccount(context, userAccountAddress)
    console.log("userTradesHistory:", userTradesHistory)

    // get the PnLs for each position
    let pnls = await calcPnLForUserPositions(context, userAccountAddress, userPositions, marketPrices, userTradesHistory)
    console.log("pnls: ", pnls)
})
