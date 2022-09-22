import fetch from 'node-fetch';
import Asset from '../types/asset';

export async function getGvolTermStructure(asset: Asset) {
    try {
        let symbol: string;

        switch (asset) {
            case Asset.Bitcoin:
                symbol = 'BTC';
                break
            case Asset.Ethereum:
                symbol = 'ETH';
                break
            case Asset.Solana:
                symbol = 'SOL';
                break
        }

        const response = await fetch('https://app.pinkswantrading.com/graphql', {
            method: 'POST',
            body: JSON.stringify({
                "query": "query OrderbookForwardImpliedVolatilityCurve1($symbol: SymbolEnumType, $exchange: ExchangeEnumType) {OrderbookForwardImpliedVolatilityCurve: genericOrderbookTermStructure(symbol: $symbol, exchange: $exchange) {expiration, markIv, forwardVolatility}}",
                "variables": {
                    // @ts-ignore
                    "symbol": symbol,
                    "exchange": "deribit"
                }
            }),
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Error! status: ${response.status}`);
        }

        let json = await response.json();

        let result = json.data.OrderbookForwardImpliedVolatilityCurve;
        console.log(result)

        return result;
    } catch (error) {
        if (error instanceof Error) {
            console.log('error message: ', error.message);
            return error.message;
        } else {
            console.log('unexpected error: ', error);
            return 'An unexpected error occurred';
        }
    }
}

getGvolTermStructure(Asset.Bitcoin);
getGvolTermStructure(Asset.Ethereum);
getGvolTermStructure(Asset.Solana);