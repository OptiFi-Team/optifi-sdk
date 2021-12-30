import {EXPIRATION_TIME, EXPIRATION_WEEKDAY, SUPPORTED_MATURITIES} from "../constants";
import MaturityType from "../types/maturityType";

function endOfMonthExpiration(offset: number,
                              startDate?: Date): Date {
    let expiration = startDate || new Date();
    expiration.setUTCMonth(expiration.getUTCMonth() + (offset-1));
    let targetMonth = expiration.getMonth();
    // We want expirations to be on Wednesdays - get to the last wednesday of this month
    while (expiration.getUTCDay() !== EXPIRATION_WEEKDAY) {
        expiration.setUTCDate(expiration.getUTCDate() + 1);
    }
    // If we bumped into the next month, go back one week to the previous Wednesday
    if (expiration.getUTCMonth() !== targetMonth) {
        expiration.setUTCDate(expiration.getUTCDate() - 7);
    }

    // If the expiration is before now, bump it forward a month
    if (new Date() >= expiration) {
        return endOfMonthExpiration(2, expiration)
    }

    return expiration;
}

export function generateExpirations(): { [maturity in MaturityType]: Date }{
    let expirations: any = {};

    for (let supportedMaturity of SUPPORTED_MATURITIES) {
        let expirationDate: Date;
        switch (supportedMaturity) {
            case MaturityType.Monthly:
                expirationDate = endOfMonthExpiration(1);
                break;
            case MaturityType.SixMonth:
                expirationDate = endOfMonthExpiration(6);
                break;
        }
        expirationDate.setUTCHours(EXPIRATION_TIME);
        expirationDate.setUTCMinutes(0);
        expirationDate.setUTCSeconds(0);
        expirationDate.setUTCMilliseconds(0);
        expirations[supportedMaturity] = expirationDate;
    }

    return expirations;
}