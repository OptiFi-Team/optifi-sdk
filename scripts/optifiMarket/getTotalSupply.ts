// @ts-ignore
import { initializeContext } from "../../index";
import Context from "../../types/context";
import { findOptifiMarketsWithFullData, getTotalSupply } from "../../utils/market";


initializeContext().then(async (context: Context) => {

    // let totalSupply = await getTotalSupply(context);

    // console.log(totalSupply)

    const openInterest = await getTotalSupply(context);
    const optifiMarkets = await findOptifiMarketsWithFullData(context);
    const oiTemp = {
        BTC: 0,
        ETH: 0,
        SOL: 0,
    };

    openInterest.forEach(oi => {
        const oiMarket = optifiMarkets.find(oim =>
            oim.instrumentAddress.equals(oi[0].instrument)
        );
        if (oiMarket?.asset == "SOL") {
            console.log(oi[0].instrumentLongSplToken.toString(), oi[0].instrumentShortSplToken.toString(), oi[2], oi[3])
            //@ts-ignore
            oiTemp[oiMarket.asset] = oiTemp[oiMarket.asset] + oi[2] - oi[3];
        }
    });

})