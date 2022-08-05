import { getPythProgramKeyForCluster, PythConnection, PythHttpClient } from "@pythnetwork/client";
import { PublicKey } from "@solana/web3.js";
import { PYTH } from "../constants";
import { initializeContext } from "../index";
import { convertSolanaCulsterToCluster, getPythData } from "../utils/pyth";

initializeContext().then(async context => {
    let cluster = convertSolanaCulsterToCluster(context.cluster)
    const programKey = getPythProgramKeyForCluster(cluster)

    // const pythConnection = new PythConnection(
    //     context.connection,
    //     programKey
    // )
    // pythConnection.onPriceChange((product, price) => {
    //     // sample output:
    //     // Crypto.SRM/USD: $8.68725 ±$0.0131 Status: Trading
    //     console.log(`${product.symbol}: $${price.price} \xB1$${price.confidence} Status:`)
    // })

    // // Start listening for price change events.
    // pythConnection.start()

    const pythClient = new PythHttpClient(context.connection, programKey, "recent");

    // const data = await pythClient.getData();
    // for (let symbol of data.symbols) {
    //     const price = data.productPrice.get(symbol)!;
    //     // Sample output:
    //     // Crypto.SRM/USD: $8.68725 ±$0.0131 Status: Trading
    //     console.log(`${symbol}: $${price.price} \xB1$${price.confidence} Status: `)
    //     console.log("productAccountKey: ", price.productAccountKey.toString())
    //     console.log("price: ", price)
    // }

    // let ETH_PRODUCT_KEY = new PublicKey("EMkxjGC1CQ7JLiutDbfYb7UKb3zm9SJcUmr1YicBsdpZ")
    // let ETH_PRICE_KEY = new PublicKey("GVXRSBjFk6e6J3NbVPXohDJetcTjaeeuykUpbQF8UoMU")

    let res = await getPythData(context, new PublicKey(PYTH[context.cluster].USDC_USD))
    console.log("getPythData", res)
})