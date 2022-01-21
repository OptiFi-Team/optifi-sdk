import Context from "../types/context";
import {PublicKey, TransactionSignature} from "@solana/web3.js";
import {findOptifiMarkets} from "../utils/market";
import {findAMMAccounts} from "../utils/amm";
import {initializeAmm} from "../instructions/initializeAmm";
import {Chain, OptifiMarket} from "../types/optifi-exchange-types";
import addInstrumentToAmm from "../instructions/addInstrumentToAmm";

interface MarketInstrumentContext {
    marketAddress: PublicKey,
    market: OptifiMarket,
    instrument: Chain
}

export default function initializeAmmOnMarkets(context: Context): Promise<TransactionSignature[]> {
    return new Promise((resolve, reject) => {
        try {
            findOptifiMarkets(context).then(async (optifiMarkets) => {
                let marketContexts: MarketInstrumentContext[] = [];
                for (let market of optifiMarkets) {
                    let chainRes = await context.program.account.chain.fetch(market[0].instrument);
                    // @ts-ignore
                    let instrument = chainRes as Chain;
                    marketContexts.push({
                        marketAddress: market[1],
                        market: market[0],
                        instrument: instrument
                    })
                }
                let ammAccounts = await findAMMAccounts(context);
                for (let ammAccount of ammAccounts) {
                    let relevantMarkets = marketContexts.filter((m) => m.instrument.asset === ammAccount[0].asset);
                    console.log("Initializing AMM account ", ammAccount, "on markets ", relevantMarkets);
                    for (let marketContext of relevantMarkets) {
                        let ammAddRes = await addInstrumentToAmm(context, ammAccount[1], marketContext.marketAddress);
                        if (ammAddRes.successful) {
                            console.log("Successfully added!");
                        } else {
                            console.error(ammAddRes);
                            reject(ammAddRes)
                        }
                    }
                }
            })
        } catch (e) {
            console.error(e);
            reject(e);
        }
    })
}