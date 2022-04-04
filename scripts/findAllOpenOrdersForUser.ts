import { initializeContext } from "../index";
import { OrderSide } from "../types/optifi-exchange-types";
import { findUserAccount } from "../utils/accounts";
import { findOptifiInstruments, findOptifiMarkets, isUserInitializedOnMarket } from '../utils/market'
import { getAllOpenOrdersForUser, getOrdersOnMarket } from "../utils/orders";
import { getSerumMarket } from '../utils/serum'
import { getAllOrdersForAccount } from '../utils/orderHistory'

/* grab all orders for user from each market */

// (async () => {
//     console.log('running local script findAllOpenOrdersForUser')
//     let context = await initializeContext()
//     let instruments = await findOptifiInstruments(context)
//     let [userAccountAddress, _] = await findUserAccount(context)
//     const orderHistory = await getAllOrdersForAccount(context, userAccountAddress)
//     let clientGuide = {}

//     orderHistory.map((history) => {
//         clientGuide[history.clientId] = history.maxBaseQuantity
//     })
//     let existingMarkets = await findOptifiMarkets(context)
//     let testSpace: any = []
//     let orderInfoStuff = existingMarkets.map(async (mkt: any) => {
//         const isUserInitialized = await isUserInitializedOnMarket(context, mkt[1])
//         console.log(mkt[1])
//         if (isUserInitialized === true) {
//             const serumMarket = await getSerumMarket(context, mkt[0].serumMarket)
//             const myOrder: any = await serumMarket.loadOrdersForOwner(context.connection, userAccountAddress)

//             if (myOrder.length > 0 && myOrder !== undefined) {
//                 const instrumentRes: any = instruments.find((instrument: any) => {
//                     return (
//                         instrument[1].toString() === mkt[0].instrument.toString()
//                     );
//                 });

//                 const openOrders: Array<any> = myOrder.map((order: any) => {
//                     if (myOrder.length > 0) {
//                         order = {
//                             ...order,
//                             marketAddress: mkt[1].toString(),
//                             price: order.price,
//                             assets: instrumentRes[0].asset,
//                             instrumentType: Object.keys(instrumentRes[0].instrumentType)[0],
//                             strike: instrumentRes[0].strike.toNumber(),
//                             expiryDate: instrumentRes[0].expiryDate.toNumber()
//                         }
//                         return order
//                     }
//                 })
//                 console.log(`Open Orders for Market ${mkt[1].toString()}`, openOrders)
//                 return (openOrders)
//             }
//         }
//     })
//     // console.log((await Promise.all(orderInfoStuff)).filter(order => order !== undefined).flat())
// })();


/*
Using getAllOpenOrdersForUser function from orders.ts
Grabs all orders from each market and return an array of orders
*/

(async () => {
    console.log('running getAllOpenOrdersForUser')
    initializeContext()
        .then(context => {
            findOptifiInstruments(context)
                .then(instruments => {
                    getAllOpenOrdersForUser(context, instruments)
                        .then(res => console.log(res))
                })
        })
})();




/* grab all orders for user from specific market */

// (async () => {
//     console.log('running getOrdersOnMarket function')
//     let context = await initializeContext()
//     let existingMarkets = await findOptifiMarkets(context)
//     let instruments = await findOptifiInstruments(context)
//     getOrdersOnMarket(context, existingMarkets[19][1], instruments)
//         .then(orders => console.log(orders))

// })();