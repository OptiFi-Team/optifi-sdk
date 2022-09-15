import fetch from 'node-fetch';
import Asset from '../types/asset';

export async function getGvolAtm7(asset: Asset) {
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

        let now = new Date();
        let from = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        const response = await fetch('https://app.pinkswantrading.com/graphql', {
            method: 'POST',
            body: JSON.stringify({
                "query": "query ConstantMaturityAtm1Min($symbol: BTCOrETHEnumType, $dateStart: String, $dateEnd: String, $interval: String){\n ConstantMaturityAtm1Min(symbol:$symbol, dateStart:$dateStart, dateEnd: $dateEnd, interval: $interval) {\n date\n atm7}\n}\n",
                "variables": {
                    // @ts-ignore
                    "symbol": symbol,
                    "dateStart": formatDate(from),
                    "dateEnd": formatDate(now),
                    "interval": "1 minute"
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

        const result = await response.json();

        for (let atm of result.data.ConstantMaturityAtm1Min) {
            if (atm.atm7 != null) {
                console.log(atm);
                return atm;
            }
        }

        console.log('All atm7 is null');
        return 'All atm7 is null';
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

function padTo2Digits(num: number) {
    return num.toString().padStart(2, '0');
}

function formatDate(date: Date) {
    return (
        [
            date.getFullYear(),
            padTo2Digits(date.getUTCMonth() + 1),
            padTo2Digits(date.getUTCDate()),
        ].join('-') +
        'T' +
        [
            padTo2Digits(date.getUTCHours()),
            padTo2Digits(date.getUTCMinutes()),
            padTo2Digits(date.getUTCSeconds()),
        ].join(':') +
        'Z'
    );
}

getGvolAtm7(Asset.Bitcoin);
getGvolAtm7(Asset.Ethereum);
getGvolAtm7(Asset.Solana);