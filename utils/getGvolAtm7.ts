import fetch from 'node-fetch';

async function getGvolAtm7(asset) {
    try {
        let now = new Date();
        let from = new Date(now.getTime() - 60 * 60 * 1000);
        const response = await fetch('https://app.pinkswantrading.com/graphql', {
            method: 'POST',
            body: JSON.stringify({
                "query": "query ConstantMaturityAtm1Min($symbol: BTCOrETHEnumType, $dateStart: String, $dateEnd: String, $interval: String){\n ConstantMaturityAtm1Min(symbol:$symbol, dateStart:$dateStart, dateEnd: $dateEnd, interval: $interval) {\n date\n atm7}\n}\n",
                "variables": {
                    "symbol": asset,
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

        const atm7 = result.data.ConstantMaturityAtm1Min[0].atm7;

        // console.log(asset, ": ", atm7);

        return atm7;
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

// getGvolAtm7('BTC');
// getGvolAtm7('ETH');
// getGvolAtm7('SOL');