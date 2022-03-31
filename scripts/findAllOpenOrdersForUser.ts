import { initializeContext } from "../index";
import { findUserAccount } from "../utils/accounts";
import { findOptifiInstruments, findOptifiMarkets, isUserInitializedOnMarket } from '../utils/market'
import { getAllOpenOrdersForUser, getOrdersOnMarket } from "../utils/orders";
import { getSerumMarket } from '../utils/serum'

// (async () => {
//     let context = await initializeContext()
//     let instruments = await findOptifiInstruments(context)
//     // console.log(instruments)
//     let [userAccountAddress, _] = await findUserAccount(context)
//     let existingMarkets = await findOptifiMarkets(context)
//     let orderInfoStuff = existingMarkets.map(async (mkt: any) => {
//         const isUserInitialized = await isUserInitializedOnMarket(context, mkt[1])
//         if (isUserInitialized === true) {
//             const serumMarket = await getSerumMarket(context, mkt[0].serumMarket)
//             const myOrder: any = await serumMarket.loadOrdersForOwner(context.connection, userAccountAddress)
//             // console.log(myOrder)

//             if (myOrder.length > 0 && myOrder !== undefined) {
//                 const instrumentRes: any = instruments.find((instrument: any) => {
//                     return (
//                         instrument[1].toString() === mkt[0].instrument.toString()
//                     );
//                 });

//                 const openOrders: Array<any> = myOrder.map((order: any) => {
//                     return {
//                         ...order,
//                         marketAddress: mkt[1].toString(),
//                         price: order.price,
//                         assets: instrumentRes[0].asset,
//                         instrumentType: Object.keys(instrumentRes[0].instrumentType)[0],
//                         strike: instrumentRes[0].strike.toNumber(),
//                         expiryDate: instrumentRes[0].expiryDate.toNumber()
//                     }
//                 })
//                 console.log(openOrders)
//             }

//         }
//     })

// })();
// (async () => {
//     let context = await initializeContext()
//     let existingMarkets = await findOptifiMarkets(context)
//     let instruments = await findOptifiInstruments(context)

//     existingMarkets.map((mkt: any) => {
//         getOrdersOnMarket(context, mkt[1], instruments)
//             .then(res => console.log(res))
//     })


// })();

(async () => {
    let context = await initializeContext()
    let instruments = await findOptifiInstruments(context)
    getAllOpenOrdersForUser(context, instruments)
        .then(res => console.log(res))
})();