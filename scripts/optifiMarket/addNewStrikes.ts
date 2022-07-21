// @ts-ignore
import { initializeContext } from "../../index";
import Context from "../../types/context";
import { PublicKey } from "@solana/web3.js";
import { createSerumMarkets } from "../../sequences/boostrap";
import { createNextOptifiMarket } from "../../instructions/createOptifiMarket";
import { createMarginStress } from "../../sequences/createMarginStress";
import { sleep } from "../../utils/generic";


initializeContext().then(async (context: Context) => {

    // // create instruments with new strikes
    // let instrumentAddresses = [
    //     new PublicKey("4dC25SPJy6tJeTKqnZtjvKMxoBa93KpuEi3o6gmjXdGu"),
    // new PublicKey("PTN6PtqK2U7gLVTFswLvujjhxM7PodaBjcUp8Uj7jRA"),
    // ]

    // // // create new serum markets
    // let createdSerumMarkets: PublicKey[] = []

    // // for (let instrument of instrumentAddresses) {
    // //     let serumMarketKey = await createSerumMarkets(context, instrument)
    // //     createdSerumMarkets.push(serumMarketKey)
    // // }

    // // console.log("createdSerumMarkets: ", createdSerumMarkets.map(e => e.toString()))

    // createdSerumMarkets = [
    // new PublicKey("BR1XSnD1fGWFdH6nbPs1Do1WZdfJ2RNanQUoSeXhqhZd"),
    // new PublicKey("6FFfAZmTH9zsCQLdZvcryTNJ2XUZJCX5P3Sx2sukKggv"),
    // ]

    // // create optifi market
    // for (let i = 0; i < instrumentAddresses.length; i++) {
    //     let instrument = instrumentAddresses[i]
    //     let serumMarket = createdSerumMarkets[i]

    //     let res = await createNextOptifiMarket(context, serumMarket, instrument)
    //     await sleep(10*1000)
    //     console.log("createNextOptifiMarket res: ", res)
    // }

    // // refresh margin stress accounts
    // await createMarginStress(context)

    // add new instrument to amm for trading
    
})
