import fetch from 'cross-fetch';

// input example
// optifiProgramId: opDV2tLVsRPGk9aYqm4gdtGotiRwjuYKUmWzWB7NfCR
// clientOrderId: 11
// userAccountAddress: AAMWtCC2ieJ8rk2R9kAHJJwmsPNPctbH4W2P3pYZLDNF
export async function getTradePrice(data: any) {
    try {
        let url = "https://lambda.optifi.app/get_trade_price?optifi_program_id=" + data.optifiProgramId +
            "&client_order_id=" + data.clientOrderId +
            "&user_account_address=" + data.userAccountAddress
        const response = await fetch(url, {
            method: "GET",
        });
        let res = await response.json()
        if (!response.ok) {
            console.log("no trade price");
        }
        return res;
    } catch (error) { console.log(error) }
}