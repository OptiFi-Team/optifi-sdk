import { PublicKey } from "@solana/web3.js";
import Context from "../types/context";
import { findUserAccount } from "./accounts"
import { getUserBalance } from "./user"
import { Order, loadOrdersAccountsForOwnerV2, loadOrdersForOwnerOnAllMarkets } from "../utils/orders";
import { loadPositionsFromUserAccount, findOptifiMarketsWithFullData, Position } from "./market"
import { UserAccount } from "../types/optifi-exchange-types";
import { PYTH, SWITCHBOARD } from "../constants";
import { initializeContext } from "../index";
import { getAllOrdersForAccount } from "../utils/orderHistory";
import { getSwitchboard } from "./switchboardV2";
import { getPythData } from "./pyth";

//   const market = new PublicKey("Dv3WX52binT7rxYfruhRN9B3uVxioF7UUHDNXvwaykZL");

interface DataResult {
    UserAccountAddress: PublicKey,
    UsdcAccountValue: number
    Positions: Position[],
    TotalNetOptionValue: number | number[],
    TotalMarginRequirement: number,
    LiquidationStatus: boolean,
    OpenOrders: Order[],
    OrderbookLocked: void[]
}

export async function fetchDataOnRegularBasis(
    context: Context,
    userWalletAddresses: PublicKey[]
) {
    try {
        let spotRes_btc = await getPythData(context, new PublicKey(PYTH[context.cluster].BTC_USD))
        let spotRes_eth = await getPythData(context, new PublicKey(PYTH[context.cluster].ETH_USD))
        let usdcSpot = await getPythData(context, new PublicKey(PYTH[context.cluster].USDC_USD))
        let spot_btc = spotRes_btc / usdcSpot
        let spot_eth = spotRes_eth / usdcSpot
        // let spot_btc = 42000;
        // let spot_eth = 3200;

        let res = userWalletAddresses.map(async (pubkey) => {
            // User account address
            // console.log(pubkey)
            const userAccountAddress = await findUserAccount(context);
            // console.log('userAccountAddress')

            // USDC account value in margin account
            const usdcAccountValue = await getUserBalance(context);
            // console.log('usdcAccountValue')

            // option positions and option values (ticker, position in number of contracts, value) per BTC and ETH
            const markets = await findOptifiMarketsWithFullData(context);
            // console.log('markets done----------------')

            const userInfo = await context.program.account.userAccount.fetch(userAccountAddress[0]);
            // console.log('userInfo -------------------')
            // @ts-ignore
            const userAccount = userInfo as UserAccount;
            const positions = await loadPositionsFromUserAccount(context, userAccount, markets);
            // console.log('positions --------------------')
            let positions_2: any = positions;


            let totalNetOptionValue: number[] = [];

            positions_2.map(pos => {
                // console.log(pos.marketId, '-------------------marketid')
                pos.marketId = pos.marketId.toString();
                switch (pos.asset) {
                    case 'BTC':
                        totalNetOptionValue.push((spot_btc - pos.strike) * pos.netPosition)
                        break
                    case 'ETH':
                        totalNetOptionValue.push((spot_eth - pos.strike) * pos.netPosition)
                        break
                }
            })

            const totalMarginRequirement = userAccount.amountToReserve;
            let totalMarginRequirement_value = 0.0;
            for (let i = 0; i < totalMarginRequirement.length; i++) {
                totalMarginRequirement_value += totalMarginRequirement[i].toNumber();
            }

            const liquidation_status = userAccount.isInLiquidation as boolean;

            let optifiMarkets = await findOptifiMarketsWithFullData(context)
            let [userAccountAddress1,] = await findUserAccount(context)

            let openOrdersAccount = await loadOrdersAccountsForOwnerV2(context, optifiMarkets, userAccountAddress1)

            // must use "confirmed" as commitment level for tx hostory related requests 
            let context2 = await initializeContext(undefined, undefined, undefined, undefined, undefined, { disableRetryOnRateLimit: true, commitment: "confirmed" })
            let orderHistory = await getAllOrdersForAccount(context2, userAccountAddress1,)
            // order history is optional, get call loadOrdersForOwnerOnAllMarkets without it first. and whenever you get user's order history,
            // just call this loadOrdersForOwnerOnAllMarkets again
            let orders = await loadOrdersForOwnerOnAllMarkets(optifiMarkets, openOrdersAccount.map(e => e.openOrdersAccount), orderHistory)

            // basTokenFree, baseTokenTotal, quoteTokenFree, quoteTokenTotal
            let orderBookLocked = new Array();
            let orderbookLocked = openOrdersAccount.map(e => {
                orderBookLocked.push([
                    e.openOrdersAccount.baseTokenFree.toNumber(),
                    e.openOrdersAccount.baseTokenTotal.toNumber(),
                    e.openOrdersAccount.quoteTokenFree.toNumber(),
                    e.openOrdersAccount.quoteTokenTotal.toNumber()
                ])
            })

            // console.log('orderbookLocked: ', orderbookLocked)

            let temp: DataResult = {
                UserAccountAddress: userAccountAddress[0],
                UsdcAccountValue: usdcAccountValue,
                Positions: positions_2,
                TotalNetOptionValue: totalNetOptionValue,
                TotalMarginRequirement: totalMarginRequirement_value,
                LiquidationStatus: liquidation_status,
                OpenOrders: orders,
                OrderbookLocked: orderBookLocked
            }

            // console.log(temp)
            return temp;
        })
        return Promise.all(res);
    }
    catch (err) {
        throw new Error('Data Fetch Error');
    }
}
