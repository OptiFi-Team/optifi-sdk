import { initializeContext } from "../index";
import { findOptifiMarketsWithFullData, getUserPositions } from "../utils/market";
import { findUserAccount } from "../utils/accounts";
import { getMarketPrice } from "../utils/getMarketPrice"

initializeContext().then(async (context) => {
    // prepare user positions
    let [userAccountAddress, _] = await findUserAccount(context)
    let userPositions = await getUserPositions(context, userAccountAddress)

    // prepare market prices
    let optifiMarkets = await findOptifiMarketsWithFullData(context)
    //console.log(optifiMarkets);

    let prices = await getMarketPrice(context, userPositions, optifiMarkets);
    console.log(prices);
})