import { reshap } from "./calculateMargin"
import Context from "../types/context";
import { OptifiMarketFullData } from "./market";
import { OrderSide } from "../types/optifi-exchange-types";
import { PublicKey } from "@solana/web3.js";
import { getSpotPrice } from "./pyth";
import Decimal from "decimal.js";
interface BreakEven {
    breakEven: string,
    toBreakEven: string
}

function calcToBreakEven(breakEven: number, spot: number) {
    return (new Decimal(breakEven).div(new Decimal(spot))).sub(new Decimal(1)).toNumber().toFixed(2)
}

export async function calcBreakEvenPoint(
    context: Context,
    optifiMarkets: OptifiMarketFullData[],
    side: OrderSide,
    marketAddress: PublicKey,
    price: number,
): Promise<BreakEven> {
    return new Promise(async (resolve, reject) => {
        try {
            let market = optifiMarkets.find(e => e.marketAddress.toString() == marketAddress.toString())

            if (market) {

                let strike = market?.strike

                let asset = (market.asset == "BTC") ? 0 : (market.asset == "ETH") ? 1 : (market.asset == "SOL") ? 3 : null

                if (asset) {

                    let spot = await getSpotPrice(context, asset)

                    if (side == OrderSide.Ask) {

                        if (market?.instrumentType == "Call") {
                            let breakEven = new Decimal(strike).add(new Decimal(price)).toNumber()
                            let res: BreakEven = {
                                breakEven: breakEven.toFixed(2),
                                toBreakEven: calcToBreakEven(breakEven, spot),
                            }
                            resolve(res);
                        } else {//Put
                            let breakEven = new Decimal(strike).sub(new Decimal(price)).toNumber()
                            let res: BreakEven = {
                                breakEven: breakEven.toFixed(2),
                                toBreakEven: calcToBreakEven(breakEven, spot),
                            }
                            resolve(res);
                        }

                    } else {

                        if (market?.instrumentType == "Call") {
                            let breakEven = new Decimal(strike).add(new Decimal(price)).toNumber()
                            let res: BreakEven = {
                                breakEven: breakEven.toFixed(2),
                                toBreakEven: calcToBreakEven(breakEven, spot),
                            }
                            resolve(res);
                        } else {//Put
                            let breakEven = new Decimal(strike).sub(new Decimal(price)).toNumber()
                            let res: BreakEven = {
                                breakEven: breakEven.toFixed(2),
                                toBreakEven: calcToBreakEven(breakEven, spot),
                            }
                            resolve(res);
                        }

                    }
                } console.log("can't find asset in calcBreakEvenPoint")
            } else { console.log("can't find market in calcBreakEvenPoint") }
        } catch (err) {
            reject(err)
        }
    })
}

